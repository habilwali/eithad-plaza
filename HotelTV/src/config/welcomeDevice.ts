/**
 * Optional: skip all hardware detection and use this MAC for the Welcome API only.
 * Must match `clients.mac_address` in the CMS. Example: 'D4:1B:81:CD:74:F7'
 */
export const WELCOME_DEVICE_MAC_OVERRIDE = '';

/**
 * When override is empty and the TV does not expose a readable MAC (common on Android TV),
 * set this to the same MAC you store in the CMS (e.g. from Settings → About or the device sticker).
 * If this stays empty and hardware MAC is null, the Welcome API is **not** called.
 */
export const WELCOME_MAC_FALLBACK_AFTER_PROBE = '';
