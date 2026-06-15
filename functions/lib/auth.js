// Authentication utilities
// Password hashing and JWT token generation

const JWT_SECRET = 'your-secret-key-change-in-production'; // 应该从环境变量读取
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Simple password hashing using Web Crypto API
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Simple JWT implementation
export async function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const claims = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(claims));
  const data = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${data}.${encodedSignature}`;
}

export async function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(atob(encodedSignature), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(data)
    );

    if (!isValid) return null;

    const payload = JSON.parse(atob(encodedPayload));

    // Check expiration
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateUsername(username) {
  // 3-20 characters, alphanumeric and underscore only
  const re = /^[a-zA-Z0-9_]{3,20}$/;
  return re.test(username);
}

export function validatePassword(password) {
  // At least 8 characters
  return password.length >= 8;
}

export function extractToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function requireAuth(request, env, requiredRole = null) {
  const token = extractToken(request);
  if (!token) {
    return { authorized: false, error: 'no_token' };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { authorized: false, error: 'invalid_token' };
  }

  // Verify user still exists and is active
  const user = await env.DB.prepare(
    'SELECT id, username, email, role, is_active FROM users WHERE id = ?'
  ).bind(payload.userId).first();

  if (!user) {
    return { authorized: false, error: 'user_not_found' };
  }

  if (!user.is_active) {
    return { authorized: false, error: 'user_inactive' };
  }

  // Check role if required
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return { authorized: false, error: 'insufficient_permissions' };
  }

  return { authorized: true, user };
}
