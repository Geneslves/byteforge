import {
  generateToken,
  hashPassword,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../../lib/auth.js';
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
    const { username, email, password } = body || {};

    if (!username || !email || !password) {
      return apiError('missing_fields', 400, 'Username, email, and password are required', request, env, METHODS);
    }
    if (!validateUsername(username)) {
      return apiError('invalid_username', 400, 'Username must be 3-20 characters, alphanumeric and underscore only', request, env, METHODS);
    }
    if (!validateEmail(email)) {
      return apiError('invalid_email', 400, 'Invalid email format', request, env, METHODS);
    }
    if (!validatePassword(password)) {
      return apiError('invalid_password', 400, 'Password must be at least 12 characters', request, env, METHODS);
    }

    const setting = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'registration_enabled'"
    ).first();

    if (setting?.value === 'false') {
      return apiError('registration_disabled', 403, 'Registration is currently disabled', request, env, METHODS);
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(username, email).first();

    if (existing) {
      return apiError('user_exists', 409, 'Username or email already exists', request, env, METHODS);
    }

    const passwordHash = await hashPassword(password);
    const userCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    const role = userCount.count === 0 ? 'admin' : 'user';
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).bind(userId, username, email, passwordHash, role, now).run();

    const token = await generateToken({ userId, username, email, role }, env);

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
    ).bind(refreshTokenId, userId, refreshTokenHash, refreshTokenExpiry, now).run();

    return json({
      ok: true,
      user: { id: userId, username, email, role },
      token,
      refreshToken: refreshTokenValue,
    }, {}, request, env, METHODS);
  } catch (error) {
    console.error('Registration error:', error);
    return apiError('server_error', 500, `Unable to register user: ${error.message}`, request, env, METHODS);
  }
}
