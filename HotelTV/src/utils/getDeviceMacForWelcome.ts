import { NativeModules, Platform } from 'react-native';
import { getMacAddress } from 'react-native-device-info';
import {
  WELCOME_DEVICE_MAC_OVERRIDE,
  WELCOME_MAC_FALLBACK_AFTER_PROBE,
} from '../config/welcomeDevice';
import { logWelcomePerf } from './welcomePerf';
import { welcomePerfSetMac } from './welcomePerfSession';

const INVALID_PRIVACY_MAC = '02:00:00:00:00:00';

type HardwareMacNative = {
  getPreferredMac: () => Promise<string>;
  getDiagnosticInfo?: () => Promise<string>;
};

const HardwareMac = NativeModules.HardwareMac as HardwareMacNative | undefined;

/** Logs sysfs / NIC / getprop snapshot when MAC cannot be resolved (use adb logcat). */
export async function logHardwareMacDiagnostics(): Promise<void> {
  if (Platform.OS !== 'android' || !HardwareMac?.getDiagnosticInfo) return;
  try {
    const text = await HardwareMac.getDiagnosticInfo();
    console.log('[HardwareMac] diagnostic (share with support if MAC is empty):\n', text);
  } catch (e) {
    console.log('[HardwareMac] diagnostic failed', e);
  }
}

/** Uppercase MAC with colons, suitable for CMS `mac_address` matching. */
export function normalizeMacForCms(mac: string): string {
  return mac.trim().toUpperCase();
}

/**
 * Native MAC: sysfs + NetworkInterface — **Ethernet and Wi‑Fi** (whichever exists on the device).
 */
async function getHardwareMacFromNative(): Promise<string | null> {
  if (Platform.OS !== 'android' || !HardwareMac?.getPreferredMac) return null;
  try {
    const raw = await HardwareMac.getPreferredMac();
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s) return null;
    if (s.toUpperCase() === INVALID_PRIVACY_MAC) return null;
    return normalizeMacForCms(s);
  } catch {
    return null;
  }
}

async function getMacFromDeviceInfo(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const mac = await getMacAddress();
    if (mac && mac.trim().length > 0 && mac.toUpperCase() !== INVALID_PRIVACY_MAC) {
      return normalizeMacForCms(mac);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function logMacResolve(t0: number, path: string): void {
  const ms = Date.now() - t0;
  logWelcomePerf('mac_resolve', ms, { path });
  welcomePerfSetMac(ms, path);
}

/**
 * MAC for Welcome API: override → native (Ethernet + Wi‑Fi sysfs/NIC) → react-native-device-info.
 * Returns null if unavailable (caller should use generic welcome UI).
 */
export async function getDeviceMacForWelcomeApi(): Promise<string | null> {
  const t0 = Date.now();

  const override = WELCOME_DEVICE_MAC_OVERRIDE.trim();
  if (override.length > 0) {
    logMacResolve(t0, 'override');
    return normalizeMacForCms(override);
  }

  if (Platform.OS !== 'android') {
    logMacResolve(t0, 'non_android');
    return null;
  }

  // Run native sysfs/NIC scan and device-info in parallel — total wait ≈ max of the two, not sum.
  const [nativeMac, deviceInfoMac] = await Promise.all([
    getHardwareMacFromNative(),
    getMacFromDeviceInfo(),
  ]);
  if (nativeMac) {
    logMacResolve(t0, 'native');
    return nativeMac;
  }
  if (deviceInfoMac) {
    logMacResolve(t0, 'device_info');
    return deviceInfoMac;
  }

  await logHardwareMacDiagnostics();

  const fallback = WELCOME_MAC_FALLBACK_AFTER_PROBE.trim();
  if (fallback.length > 0) {
    console.log(
      '[WelcomeGuest] hardware MAC unavailable — using WELCOME_MAC_FALLBACK_AFTER_PROBE for Welcome API',
    );
    logMacResolve(t0, 'fallback_config');
    return normalizeMacForCms(fallback);
  }

  logMacResolve(t0, 'none');
  return null;
}
