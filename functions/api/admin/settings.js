import { requireAuth } from '../../lib/auth.js';
import { apiError, json, optionsResponse, requireDatabase } from '../../lib/http.js';

const METHODS = 'GET, PUT, OPTIONS';

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS);
}

export async function onRequestGet({ request, env }) {
  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, 'Database binding not configured', request, env, METHODS);
  }

  try {
    const auth = await requireAuth(request, env, 'admin');
    if (!auth.authorized) {
      return apiError(auth.error, 403, 'Admin access required', request, env, METHODS);
    }

    const settings = await env.DB.prepare('SELECT key, value, updated_at FROM settings').all();
    const settingsObj = {};

    for (const setting of settings.results || []) {
      settingsObj[setting.key] = setting.value === 'true'
        ? true
        : setting.value === 'false'
          ? false
          : setting.value;
    }

    return json({ ok: true, settings: settingsObj }, {}, request, env, METHODS);
  } catch {
    return apiError('database_error', 500, 'Unable to load settings', request, env, METHODS);
  }
}

export async function onRequestPut({ request, env }) {
  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, 'Database binding not configured', request, env, METHODS);
  }

  try {
    const auth = await requireAuth(request, env, 'admin');
    if (!auth.authorized) {
      return apiError(auth.error, 403, 'Admin access required', request, env, METHODS);
    }

    const body = await request.json().catch(() => null);
    const updates = body?.settings;

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return apiError('invalid_input', 400, 'Settings object required', request, env, METHODS);
    }

    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = typeof value === 'boolean' ? value.toString() : String(value);

      await env.DB.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `).bind(key, stringValue, now, stringValue, now).run();
    }

    return json({ ok: true, message: 'Settings updated successfully' }, {}, request, env, METHODS);
  } catch {
    return apiError('database_error', 500, 'Unable to update settings', request, env, METHODS);
  }
}
