import { generateToken, verifyPassword } from '../../lib/auth.js';
import { apiError, json, optionsResponse, requireDatabase } from '../../lib/http.js';

const METHODS = 'POST, OPTIONS';

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS);
}

export async function onRequestPost({ request, env }) {
  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, 'Database binding not configured', request, env, METHODS);
  }

  try {
    const body = await request.json().catch(() => null);
    const { username, password } = body || {};

    if (!username || !password) {
      return apiError('missing_fields', 400, 'Username and password are required', request, env, METHODS);
    }

    const user = await env.DB.prepare(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ? OR email = ?'
    ).bind(username, username).first();

    if (!user) {
      return apiError('invalid_credentials', 401, 'Invalid username or password', request, env, METHODS);
    }
    if (!user.is_active) {
      return apiError('user_inactive', 403, 'Your account has been deactivated', request, env, METHODS);
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return apiError('invalid_credentials', 401, 'Invalid username or password', request, env, METHODS);
    }

    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?')
      .bind(now, user.id)
      .run();

    const token = await generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    }, env);

    // Generate refresh token
    const refreshTokenValue = crypto.randomUUID();

    // Hash refresh token for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(refreshTokenValue);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const refreshTokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store refresh token (30 days expiry)
    const refreshTokenId = crypto.randomUUID();
    const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked) VALUES (?, ?, ?, ?, ?, 0)'
    ).bind(refreshTokenId, user.id, refreshTokenHash, refreshTokenExpiry, now).run();

    return json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
      refreshToken: refreshTokenValue,
    }, {}, request, env, METHODS);
  } catch {
    return apiError('server_error', 500, 'Unable to log in', request, env, METHODS);
  }
}
