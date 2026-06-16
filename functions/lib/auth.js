const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 210000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const encoder = new TextEncoder();

const base64UrlEncode = (bytes) => {
  const binary = typeof bytes === 'string'
    ? bytes
    : String.fromCharCode(...new Uint8Array(bytes));

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (value) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const importJwtKey = (env, usages) => {
  if (!env?.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return crypto.subtle.importKey(
    'raw',
    encoder.encode(env.JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
};

const importPasswordKey = (password) =>
  crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);

const derivePasswordHash = async (password, salt, iterations) => {
  const key = await importPasswordKey(password);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    key,
    KEY_BITS
  );

  return new Uint8Array(bits);
};

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePasswordHash(password, salt, PBKDF2_ITERATIONS);

  return [
    'pbkdf2_sha256',
    String(PBKDF2_ITERATIONS),
    base64UrlEncode(salt),
    base64UrlEncode(hash),
  ].join('$');
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, iterationsValue, encodedSalt, encodedHash] = String(storedHash || '').split('$');
  if (algorithm !== 'pbkdf2_sha256' || !iterationsValue || !encodedSalt || !encodedHash) {
    return false;
  }

  const iterations = Number(iterationsValue);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;

  const salt = base64UrlDecode(encodedSalt);
  const expectedHash = base64UrlDecode(encodedHash);
  const actualHash = await derivePasswordHash(password, salt, iterations);

  if (actualHash.byteLength !== expectedHash.byteLength) return false;

  let difference = 0;
  for (let index = 0; index < expectedHash.byteLength; index += 1) {
    difference |= expectedHash[index] ^ actualHash[index];
  }

  return difference === 0;
}

export async function generateToken(payload, env) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const claims = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_MS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await importJwtKey(env, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));

  return `${data}.${base64UrlEncode(signature)}`;
}

export async function verifyToken(token, env) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const key = await importJwtKey(env, ['verify']);
    const signature = base64UrlDecode(encodedSignature);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
    if (!isValid) return null;

    const payloadText = new TextDecoder().decode(base64UrlDecode(encodedPayload));
    const payload = JSON.parse(payloadText);
    if (payload.exp && payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 12;
}

export function extractToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);
  return null;
}

export async function requireAuth(request, env, requiredRole = null) {
  const token = extractToken(request);
  if (!token) return { authorized: false, error: 'no_token' };

  const payload = await verifyToken(token, env);
  if (!payload) return { authorized: false, error: 'invalid_token' };

  const user = await env.DB.prepare(
    'SELECT id, username, email, role, is_active FROM users WHERE id = ?'
  ).bind(payload.userId).first();

  if (!user) return { authorized: false, error: 'user_not_found' };
  if (!user.is_active) return { authorized: false, error: 'user_inactive' };
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return { authorized: false, error: 'insufficient_permissions' };
  }

  return { authorized: true, user };
}
