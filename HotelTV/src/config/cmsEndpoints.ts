/**
 * CMS / realtime endpoints (alerts + notifications + welcome + IPTV + guest facilities).
 * Override with babel-plugin-transform-inline-environment-variables, or edit defaults:
 *   HOTEL_CMS_HOST, HOTEL_CMS_HTTP_PORT
 * Full origin override (https or custom path):
 *   HOTEL_CMS_BASE_URL e.g. https://my-server.com
 */
const CMS_HOST = process.env.HOTEL_CMS_HOST ?? '192.168.70.115';
const CMS_HTTP_PORT = process.env.HOTEL_CMS_HTTP_PORT ?? '80';

/** CMS HTTP origin without trailing slash (same host/port as index.php APIs). */
export function getCmsHttpOrigin(): string {
  const override = process.env.HOTEL_CMS_BASE_URL?.trim();
  if (override) {
    return override.replace(/\/$/, '');
  }
  return `http://${CMS_HOST}:${CMS_HTTP_PORT}`;
}

/**
 * Join a path (or relative URL) to the CMS origin without double slashes.
 * Use for API-relative assets: `uploads/foo.png`, `/uploads/foo.png`.
 */
export function joinCmsHttpPath(path: string): string {
  const base = getCmsHttpOrigin();
  const p = path.trim().replace(/^\/+/, '');
  return `${base}/${p}`;
}

/** Absolute http(s) URLs pass through; otherwise joined to CMS origin. */
export function resolveCmsMediaUrl(relativeOrAbsolute: string): string {
  const t = relativeOrAbsolute.trim();
  if (!t) {
    return '';
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  return joinCmsHttpPath(t);
}

/** GET welcome guest by device MAC (URL-encoded). */
export function buildWelcomeApiUrl(macAddress: string): string {
  const mac = encodeURIComponent(macAddress);
  return `${getCmsHttpOrigin()}/api/welcome_api.php?mac_address=${mac}`;
}

/** IPTV packages for MAC (`getPackages.php`). */
export function buildGetPackagesUrl(mac: string): string {
  const m = encodeURIComponent(mac);
  return `${getCmsHttpOrigin()}/api/getPackages.php?mac=${m}`;
}

/** Etihad TV packages for MAC (`get_etihad_packages.php`). */
export function buildGetEtihadPackagesUrl(mac: string): string {
  const m = encodeURIComponent(mac);
  return `${getCmsHttpOrigin()}/api/get_etihad_packages.php?mac=${m}`;
}

/**
 * IPTV channels for a category/package (`getChannels.php`).
 * On production TV builds always pass `mac` so results match `channel_mac_map`.
 */
export function buildGetChannelsUrl(categoryId: number, mac: string): string {
  const m = encodeURIComponent(mac);
  return `${getCmsHttpOrigin()}/api/getChannels.php?category_id=${encodeURIComponent(
    String(categoryId),
  )}&mac=${m}`;
}

/** Etihad TV categories for MAC (`get_etihad_categories.php`). */
export function buildGetEtihadCategoriesUrl(mac: string): string {
  const m = encodeURIComponent(mac);
  return `${getCmsHttpOrigin()}/api/get_etihad_categories.php?mac=${m}`;
}

/** Etihad TV channels for a category (`get_etihad_channels.php`). */
export function buildGetEtihadChannelsUrl(categoryId: number): string {
  return `${getCmsHttpOrigin()}/api/get_etihad_channels.php?category_id=${encodeURIComponent(
    String(categoryId),
  )}`;
}

/**
 * Guest-scoped facilities for the Facilities screen (`get_guest_facilities.php`).
 * Sends TV MAC when available so the CMS can filter by guest/room if needed.
 */
export function buildGetGuestFacilitiesUrl(
  mac: string | null | undefined,
): string {
  const base = `${getCmsHttpOrigin()}/api/get_guest_facilities.php`;
  if (mac && mac.trim()) {
    return `${base}?mac=${encodeURIComponent(mac.trim().toUpperCase())}`;
  }
  return base;
}

/** Etihad Plaza TV home screen (`etihad-plaza/home.php`). */
export function buildEtihadPlazaHomeUrl(): string {
  return `${getCmsHttpOrigin()}/api/etihad-plaza/home.php`;
}

export const CMS_WS_URL = `ws://${CMS_HOST}:8765`;
export const CMS_ALERT_POLL_URL = `${getCmsHttpOrigin()}/index.php?api=alert`;
export const CMS_NOTIFICATIONS_REST_URL = `${getCmsHttpOrigin()}/index.php?api=notifications`;
