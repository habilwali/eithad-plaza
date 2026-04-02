import { getCmsHttpOrigin } from '../config/cmsEndpoints';

const UPDATE_CHECK_TIMEOUT_MS = 10_000;

export interface UpdateInfo {
  update_available: true;
  version_name: string;
  version_code: number;
  apk_url: string;
  release_notes: string;
  is_force_update: boolean;
}

export type UpdateCheckResult =
  | { available: false }
  | { available: true; info: UpdateInfo }
  | { available: false; error: string };

export async function checkForUpdate(versionCode: number): Promise<UpdateCheckResult> {
  const url = `${getCmsHttpOrigin().replace(':80', ':8080')}/api/app/check-update.php?version_code=${versionCode}`;

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), UPDATE_CHECK_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(tid);
  } catch {
    clearTimeout(tid);
    return { available: false, error: 'Network error' };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { available: false, error: 'Invalid response' };
  }

  if (typeof body !== 'object' || body === null) {
    return { available: false, error: 'Empty response' };
  }

  const rec = body as Record<string, unknown>;

  if (rec.update_available !== true) {
    return { available: false };
  }

  return {
    available: true,
    info: {
      update_available: true,
      version_name: typeof rec.version_name === 'string' ? rec.version_name : '',
      version_code: typeof rec.version_code === 'number' ? rec.version_code : 0,
      apk_url: typeof rec.apk_url === 'string' ? rec.apk_url : '',
      release_notes: typeof rec.release_notes === 'string' ? rec.release_notes : '',
      is_force_update: rec.is_force_update === true,
    },
  };
}
