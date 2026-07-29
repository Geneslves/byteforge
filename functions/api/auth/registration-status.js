import { json, optionsResponse } from '../../lib/http.js'

const METHODS = 'GET, OPTIONS'

export async function onRequestGet({ request, env }) {
  return json({
    ok: true,
    enabled: env.REGISTRATION_ENABLED === 'true',
  }, {}, request, env, METHODS)
}

export async function onRequestOptions({ request, env }) {
  return optionsResponse(request, env, METHODS)
}
