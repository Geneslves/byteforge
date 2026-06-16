import { generateToken, verifyToken } from '../../../lib/auth.js';
import { apiError, json, optionsResponse, requireDatabase } from '../../../lib/http.js';

const METHODS = 'POST, OPTIONS';
const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Refresh Token API
 * POST /api/v1/auth/refresh
 *
 * Request body:
 * {
 *   "refreshToken": "string"
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "token": "new-access-token"
 * }
 */

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS);
}

export async function onRequestPost({ request, env }) {
  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, 'Database binding not configured', request, env, METHODS);
  }

  try {
    const body = await request.json().catch(() => null);
    const { refreshToken } = body || {};

    if (!refreshToken || typeof refreshToken !== 'string') {
      return apiError('missing_refresh_token', 400, 'Refresh token is required', request, env, METHODS);
    }

    // Hash the refresh token for lookup
    const encoder = new TextEncoder();
    const data = encoder.encode(refreshToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Find refresh token in database
    const tokenRecord = await env.DB.prepare(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > ? AND revoked = 0'
    ).bind(tokenHash, new Date().toISOString()).first();

    if (!tokenRecord) {
      return apiError('invalid_refresh_token', 401, 'Invalid or expired refresh token', request, env, METHODS);
    }

    // Get user information
    const user = await env.DB.prepare(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?'
    ).bind(tokenRecord.user_id).first();

    if (!user) {
      return apiError('user_not_found', 401, 'User not found', request, env, METHODS);
    }

    if (!user.is_active) {
      return apiError('user_inactive', 403, 'Your account has been deactivated', request, env, METHODS);
    }

    // Generate new access token
    const newAccessToken = await generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    }, env);

    // Update last login
    await env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?')
      .bind(new Date().toISOString(), user.id)
      .run();

    return json({
      ok: true,
      token: newAccessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    }, {}, request, env, METHODS);
  } catch (error) {
    return apiError('server_error', 500, 'Unable to refresh token', request, env, METHODS);
  }
}
