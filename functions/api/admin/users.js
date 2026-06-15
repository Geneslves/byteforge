// GET /api/admin/users
// List and manage users (admin only)

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
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

// List all users
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

    const users = await env.DB.prepare(`
      SELECT id, username, email, role, is_active, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `).all();

    return json({
      ok: true,
      users: users.results || []
    }, { headers: corsHeaders });

  } catch (error) {
    return json({
      ok: false,
      error: 'server_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}

// Update user (activate/deactivate, change role)
export async function onRequestPatch({ request, env }) {
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
    const { userId, isActive, role } = body;

    if (!userId) {
      return json({
        ok: false,
        error: 'missing_user_id',
        message: 'User ID required'
      }, { status: 400, headers: corsHeaders });
    }

    // Prevent admin from deactivating themselves
    if (userId === auth.user.id && isActive === false) {
      return json({
        ok: false,
        error: 'cannot_deactivate_self',
        message: 'Cannot deactivate your own account'
      }, { status: 400, headers: corsHeaders });
    }

    const updates = [];
    const params = [];

    if (typeof isActive === 'boolean') {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (role && ['user', 'admin'].includes(role)) {
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return json({
        ok: false,
        error: 'no_updates',
        message: 'No valid updates provided'
      }, { status: 400, headers: corsHeaders });
    }

    params.push(userId);

    await env.DB.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();

    return json({
      ok: true,
      message: 'User updated successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    return json({
      ok: false,
      error: 'server_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
