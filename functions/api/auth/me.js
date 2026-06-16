import { requireAuth } from '../../lib/auth.js';
import { apiError, json, optionsResponse, requireDatabase } from '../../lib/http.js';

const METHODS = 'GET, OPTIONS';

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS);
}

export async function onRequestGet({ request, env }) {
  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, 'Database binding not configured', request, env, METHODS);
  }

  try {
    const auth = await requireAuth(request, env);
    if (!auth.authorized) {
      return apiError(auth.error, 401, 'Authentication required', request, env, METHODS);
    }

    return json({
      ok: true,
      user: {
        id: auth.user.id,
        username: auth.user.username,
        email: auth.user.email,
        role: auth.user.role,
      },
    }, {}, request, env, METHODS);
  } catch {
    return apiError('server_error', 500, 'Unable to load user', request, env, METHODS);
  }
}
