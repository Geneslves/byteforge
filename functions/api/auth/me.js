// GET /api/auth/me
// Get current user info

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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return json({
      ok: false,
      error: 'database_not_configured'
    }, { status: 503, headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(request, env);

    if (!auth.authorized) {
      return json({
        ok: false,
        error: auth.error,
        message: 'Authentication required'
      }, { status: 401, headers: corsHeaders });
    }

    return json({
      ok: true,
      user: {
        id: auth.user.id,
        username: auth.user.username,
        email: auth.user.email,
        role: auth.user.role
      }
    }, { headers: corsHeaders });

  } catch (error) {
    return json({
      ok: false,
      error: 'server_error',
      message: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
