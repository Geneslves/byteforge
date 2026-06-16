import { requireAuth } from '../../lib/auth.js';
import { apiError, json, optionsResponse, requireDatabase } from '../../lib/http.js';

const METHODS = 'GET, PATCH, OPTIONS';

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

    const users = await env.DB.prepare(`
      SELECT id, username, email, role, is_active, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `).all();

    return json({ ok: true, users: users.results || [] }, {}, request, env, METHODS);
  } catch {
    return apiError('database_error', 500, 'Unable to load users', request, env, METHODS);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, 'Database binding not configured', request, env, METHODS);
  }

  try {
    const auth = await requireAuth(request, env, 'admin');
    if (!auth.authorized) {
      return apiError(auth.error, 403, 'Admin access required', request, env, METHODS);
    }

    const body = await request.json().catch(() => null);
    const { userId, isActive, role } = body || {};

    if (!userId) {
      return apiError('missing_user_id', 400, 'User ID required', request, env, METHODS);
    }
    if (userId === auth.user.id && isActive === false) {
      return apiError('cannot_deactivate_self', 400, 'Cannot deactivate your own account', request, env, METHODS);
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
      return apiError('no_updates', 400, 'No valid updates provided', request, env, METHODS);
    }

    params.push(userId);
    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

    return json({ ok: true, message: 'User updated successfully' }, {}, request, env, METHODS);
  } catch {
    return apiError('database_error', 500, 'Unable to update user', request, env, METHODS);
  }
}
