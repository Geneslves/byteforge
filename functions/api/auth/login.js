// POST /api/auth/login
// User login

import { verifyPassword, generateToken } from '../../lib/auth.js';

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
    const { username, password } = body;

    if (!username || !password) {
      return json({
        ok: false,
        error: 'missing_fields',
        message: 'Username and password are required'
      }, { status: 400, headers: corsHeaders });
    }

    // Find user by username or email
    const user = await env.DB.prepare(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ? OR email = ?'
    ).bind(username, username).first();

    if (!user) {
      return json({
        ok: false,
        error: 'invalid_credentials',
        message: 'Invalid username or password'
      }, { status: 401, headers: corsHeaders });
    }

    // Check if user is active
    if (!user.is_active) {
      return json({
        ok: false,
        error: 'user_inactive',
        message: 'Your account has been deactivated'
      }, { status: 403, headers: corsHeaders });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return json({
        ok: false,
        error: 'invalid_credentials',
        message: 'Invalid username or password'
      }, { status: 401, headers: corsHeaders });
    }

    // Update last login
    await env.DB.prepare(
      'UPDATE users SET last_login = ? WHERE id = ?'
    ).bind(new Date().toISOString(), user.id).run();

    // Generate token
    const token = await generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    return json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
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
