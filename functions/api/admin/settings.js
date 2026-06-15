// GET/PUT /api/admin/settings
// System settings management (admin only)

import { requireAuth } from '../../lib/auth.js';

const json = (body, init = {}) => Response.json(body, {
  headers: {
    'cache-control': 'no-store',
    'content-type': 'application/json',
    ...init.headers
  },
  ...init,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

// Get all settings
export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return json({
      ok: false,
      error: 'database_not_configured'
    }, { status: 503, headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(request, env, 'admin');

    if (!auth.authorized) {
      return json({
        ok: false,
        error: auth.error,
        message: 'Admin access required'
      }, { status: 403, headers: corsHeaders });
    }

    const settings = await env.DB.prepare(
      'SELECT key, value, updated_at FROM settings'
    ).all();

    const settingsObj = {};
    (settings.results || []).forEach(s => {
      settingsObj[s.key] = s.value === 'true' ? true : s.value === 'false' ? false : s.value;
    });

    return json({
      ok: true,
      settings: settingsObj
    }, { headers: corsHeaders });

  } catch (error) {
    return json({
      ok: false,
      error: 'server_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}

// Update settings
export async function onRequestPut({ request, env }) {
  if (!env.DB) {
    return json({
      ok: false,
      error: 'database_not_configured'
    }, { status: 503, headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(request, env, 'admin');

    if (!auth.authorized) {
      return json({
        ok: false,
        error: auth.error,
        message: 'Admin access required'
      }, { status: 403, headers: corsHeaders });
    }

    const body = await request.json();
    const updates = body.settings;

    if (!updates || typeof updates !== 'object') {
      return json({
        ok: false,
        error: 'invalid_input',
        message: 'Settings object required'
      }, { status: 400, headers: corsHeaders });
    }

    const now = new Date().toISOString();

    // Update each setting
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = typeof value === 'boolean' ? value.toString() : String(value);

      await env.DB.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `).bind(key, stringValue, now, stringValue, now).run();
    }

    return json({
      ok: true,
      message: 'Settings updated successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    return json({
      ok: false,
      error: 'server_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
