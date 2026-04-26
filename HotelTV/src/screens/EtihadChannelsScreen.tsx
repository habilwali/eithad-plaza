/**
 * Etihad Channels screen — same TV-channel UI powered by the dedicated
 * Etihad TV API (get_etihad_packages / get_etihad_channels endpoints).
 *
 * The regular TV Channel page continues to use the standard IPTV CMS API
 * (getPackages / getChannels).  This screen uses a fully separate service.
 */

import React, {useEffect, useState, useCallback} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ChannelScreen from './ChannelScreen';
import type {ChannelDataConfig, ChannelItem} from '../data/channelData';
import {resolveCmsChannelStreamUrl} from '../config/cmsEndpoints';
import {FontFamily} from '../theme/typography';
import {Colors} from '../theme/colors';
import {AppHeader} from '../components/common/AppHeader';
import {useAppHeaderClock} from '../hooks/useAppHeaderClock';
import {getDeviceMacForWelcomeApi} from '../utils/getDeviceMacForWelcome';
import {
  fetchEtihadPackages,
  fetchEtihadChannels,
  type EtihadChannelRow,
  type EtihadPackageRow,
  type EtihadPackagesResult,
} from '../services/etihadTvApi';
import {useRemoteKeys} from '../hooks/useRemoteKeys';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function hashHue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return `hsl(${h} 35% 42%)`;
}

function cmsRowToChannelItem(
  ch: EtihadChannelRow,
  packageId: number,
): ChannelItem {
  const offline = /offline|disabled|down/i.test(String(ch.status || ''));
  return {
    id: ch.id,
    cat: String(packageId),
    name: ch.name,
    program: ch.status ? String(ch.status) : 'Live',
    time: '—',
    progress: 0,
    hd: true,
    live: !offline,
    color: hashHue(ch.name),
    videoUrl: resolveCmsChannelStreamUrl(ch.stream_url),
  };
}

function packagesErrorMessage(
  res: Extract<EtihadPackagesResult, {ok: false}>,
): string {
  switch (res.reason) {
    case 'invalid_mac':
      return res.message || 'Invalid device';
    case 'client_not_found':
      return res.message || 'Device not registered';
    case 'not_checked_in':
      return res.message || 'Please check in';
    case 'no_mac':
      return 'Unable to read this device.';
    case 'network':
      return res.message || 'Network error.';
    default:
      return res.message || 'Could not load packages';
  }
}

async function buildChannelConfig(
  _mac: string,
  packages: EtihadPackageRow[],
): Promise<ChannelItem[]> {
  // Etihad channels endpoint does not require MAC — just category_id
  const results = await Promise.all(
    packages.map(p => fetchEtihadChannels(p.id)),
  );
  const items: ChannelItem[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < packages.length; i++) {
    const res = results[i];
    const pkg = packages[i];
    if (!res.ok) {
      continue;
    }
    for (const ch of res.channels) {
      if (seen.has(ch.id)) {
        continue;
      }
      seen.add(ch.id);
      items.push(cmsRowToChannelItem(ch, pkg.id));
    }
  }
  return items;
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export interface EtihadChannelsScreenProps {
  onBack: () => void;
  isActive?: boolean;
}

export default function EtihadChannelsScreen({
  onBack,
  isActive = true,
}: EtihadChannelsScreenProps) {
  const headerClock = useAppHeaderClock();
  const [reloadToken, setReloadToken] = useState(0);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [config, setConfig] = useState<ChannelDataConfig | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadState('loading');
      setErrorMsg('');
      setConfig(null);

      const mac = await getDeviceMacForWelcomeApi();
      if (cancelled) {return;}

      const pkgRes = await fetchEtihadPackages(mac);
      if (cancelled) {return;}
      if (!pkgRes.ok) {
        setLoadState('error');
        setErrorMsg(packagesErrorMessage(pkgRes));
        return;
      }
      if (pkgRes.packages.length === 0) {
        setLoadState('error');
        setErrorMsg('No Etihad packages available for this device.');
        return;
      }

      const channels = await buildChannelConfig(mac, pkgRes.packages);
      if (cancelled) {return;}
      if (channels.length === 0) {
        setLoadState('error');
        setErrorMsg('No Etihad channels assigned for this device.');
        return;
      }

      const categories = [
        {id: 'all', label: 'All Channels'},
        ...pkgRes.packages.map(p => ({
          id: String(p.id),
          label: p.name,
        })),
      ];

      setConfig({
        sidebarTitle: 'ETIHAD TV',
        categories,
        channels,
      });
      setLoadState('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive, reloadToken]);

  const handleRetry = useCallback(() => setReloadToken(t => t + 1), []);

  const onFallback = loadState !== 'ready';
  useRemoteKeys({
    isActive: isActive && onFallback,
    onBack,
  });

  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive || !onFallback) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [isActive, onFallback, onBack]);

  if (loadState === 'error') {
    return (
      <View style={st.fallbackRoot}>
        <AppHeader
          date={headerClock.date}
          time={headerClock.time}
          temperature={headerClock.temperature}
          weatherCondition={headerClock.weatherCondition}
        />
        <View style={st.fallback}>
          <Text style={st.errorTitle}>Channels unavailable</Text>
          <Text style={st.errorBody}>{errorMsg}</Text>
          <TouchableOpacity
            style={st.retryBtn}
            onPress={handleRetry}
            focusable>
            <Text style={st.retryBtnTxt}>TRY AGAIN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.backLink}
            onPress={onBack}
            focusable
            hasTVPreferredFocus>
            <Text style={st.backLinkTxt}>‹ BACK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loadState === 'loading' || !config) {
    return (
      <View style={st.fallbackRoot}>
        <AppHeader
          date={headerClock.date}
          time={headerClock.time}
          temperature={headerClock.temperature}
          weatherCondition={headerClock.weatherCondition}
        />
        <View style={st.fallback}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={st.fallbackTxt}>Loading Etihad channels…</Text>
        </View>
      </View>
    );
  }

  return (
    <ChannelScreen
      key={`etihad-ch-${config.channels.length}-${config.categories.length}-${reloadToken}`}
      onBack={onBack}
      isActive={isActive}
      config={config}
    />
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */

const st = StyleSheet.create({
  fallbackRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fallback: {
    flex: 1,
    backgroundColor: Colors.background.dark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  fallbackTxt: {
    fontFamily: FontFamily.book,
    color: Colors.text.muted,
    fontSize: 12,
    marginTop: 8,
  },
  errorTitle: {
    fontFamily: FontFamily.medium,
    color: Colors.primary,
    fontSize: 16,
    marginBottom: 8,
  },
  errorBody: {
    fontFamily: FontFamily.book,
    color: Colors.text.light,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnTxt: {
    fontFamily: FontFamily.medium,
    color: Colors.primary,
    fontSize: 11,
    letterSpacing: 2,
  },
  backLink: {marginTop: 8, padding: 12},
  backLinkTxt: {
    fontFamily: FontFamily.medium,
    color: Colors.primary,
    fontSize: 12,
    letterSpacing: 2,
  },
});
