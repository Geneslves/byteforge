import { requireAuth } from '../../../lib/auth.js';
import { apiError, json, optionsResponse, requireDatabase } from '../../../lib/http.js';

const METHODS = 'DELETE, OPTIONS';

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS);
}

export async function onRequestDelete({ request, env }) {
  if (!requireDatabase(env)) {
    return apiError('database_not_configured', 503, 'Database binding not configured', request, env, METHODS);
  }

  try {
    const auth = await requireAuth(request, env, 'admin');
    if (!auth.authorized) {
      return apiError(auth.error, 403, 'Admin access required', request, env, METHODS);
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id || id === 'delete') {
      return apiError('missing_id', 400, 'Feedback ID is required', request, env, METHODS);
    }

    const result = await env.DB.prepare('DELETE FROM feedback WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) {
      return apiError('not_found', 404, 'Feedback not found', request, env, METHODS);
    }

    return json({ ok: true, id, deleted: true }, {}, request, env, METHODS);
  } catch {
    return apiError('database_error', 500, 'Unable to delete feedback', request, env, METHODS);
  }
}
