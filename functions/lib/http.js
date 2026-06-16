const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8788',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8788',
];

const splitOrigins = (value = '') =>
  value.split(',').map((origin) => origin.trim()).filter(Boolean);

export const getAllowedOrigins = (env = {}) => [
  ...DEFAULT_ALLOWED_ORIGINS,
  ...splitOrigins(env.ALLOWED_ORIGINS),
  ...(env.SITE_ORIGIN ? [env.SITE_ORIGIN] : []),
];

export const getCorsHeaders = (request, env, methods = 'GET, OPTIONS') => {
  const origin = request?.headers?.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);
  const headers = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
};

export const optionsResponse = (request, env, methods) =>
  new Response(null, { status: 204, headers: getCorsHeaders(request, env, methods) });

export const json = (body, init = {}, request = null, env = {}, methods = 'GET, OPTIONS') => Response.json(body, {
  ...init,
  headers: {
    'cache-control': 'no-store',
    'content-type': 'application/json',
    ...getCorsHeaders(request, env, methods),
    ...init.headers,
  },
});

export const apiError = (error, status = 500, publicMessage = 'Request failed', request = null, env = {}, methods = 'GET, OPTIONS') => {
  if (status >= 500) {
    console.error(JSON.stringify({
      level: 'error',
      error,
      status,
      at: new Date().toISOString(),
    }));
  }

  return json({
    ok: false,
    error,
    message: publicMessage,
  }, { status }, request, env, methods);
};

export const requireDatabase = (env) => Boolean(env?.DB);
