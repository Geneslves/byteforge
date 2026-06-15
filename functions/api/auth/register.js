// POST /api/auth/register
// User registration

import { hashPassword, validateEmail, validateUsername, validatePassword, generateToken } from '../../lib/auth.js';

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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({
      ok: false,
      error: 'database_not_configured'
    }, { status: 503, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Validate input
    if (!username || !email || !password) {
      return json({
        ok: false,
        error: 'missing_fields',
        message: 'Username, email, and password are required'
      }, { status: 400, headers: corsHeaders });
    }

    if (!validateUsername(username)) {
      return json({
        ok: false,
        error: 'invalid_username',
        message: 'Username must be 3-20 characters, alphanumeric and underscore only'
      }, { status: 400, headers: corsHeaders });
    }

    if (!validateEmail(email)) {
      return json({
        ok: false,
        error: 'invalid_email',
        message: 'Invalid email format'
      }, { status: 400, headers: corsHeaders });
    }

    if (!validatePassword(password)) {
      return json({
        ok: false,
        error: 'invalid_password',
        message: 'Password must be at least 8 characters'
      }, { status: 400, headers: corsHeaders });
    }

    // Check if registration is enabled
    const setting = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'registration_enabled'"
    ).first();

    if (setting && setting.value === 'false') {
      return json({
        ok: false,
        error: 'registration_disabled',
        message: 'Registration is currently disabled'
      }, { status: 403, headers: corsHeaders });
    }

    // Check if username or email already exists
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(username, email).first();

    if (existing) {
      return json({
        ok: false,
        error: 'user_exists',
        message: 'Username or email already exists'
      }, { status: 409, headers: corsHeaders });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user (first user becomes admin)
    const userCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    const role = userCount.count === 0 ? 'admin' : 'user';

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).bind(userId, username, email, passwordHash, role, now).run();

    // Generate token
    const token = await generateToken({
      userId,
      username,
      email,
      role
    });

    return json({
      ok: true,
      user: {
        id: userId,
        username,
        email,
        role
      },
      token
    }, { headers: corsHeaders });

  } catch (error) {
    return json({
      ok: false,
      error: 'server_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
