/**
 * API Client with automatic token refresh
 *
 * Features:
 * - Automatic access token refresh when expired
 * - Handles 401 errors gracefully
 * - Redirects to login when refresh token expires
 */

const API_BASE = location.hostname === 'localhost' ? 'http://localhost:8788' : '';

// Export API_BASE for use in test pages
window.API_BASE = API_BASE;

/**
 * Refresh the access token using refresh token
 * @returns {Promise<string|null>} New access token or null if failed
 */
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();

    if (data.ok && data.token) {
      // Save new access token
      localStorage.setItem('auth_token', data.token);
      return data.token;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Logout and redirect to login page
 */
function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');

  const currentPath = location.pathname;
  if (currentPath !== '/login.html') {
    location.href = `/login.html?redirect=${encodeURIComponent(currentPath)}`;
  }
}

/**
 * Make an authenticated API request with automatic token refresh
 *
 * @param {string} url - API endpoint URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function apiRequest(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  let token = localStorage.getItem('auth_token');

  // Add authorization header
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : undefined,
  };

  // Remove undefined headers
  Object.keys(headers).forEach(key => {
    if (headers[key] === undefined) delete headers[key];
  });

  // Make the request
  let response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // If 401 (Unauthorized), try to refresh token and retry
  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      // Retry the request with new token
      headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(fullUrl, {
        ...options,
        headers,
      });
    } else {
      // Refresh failed, logout user
      logout();
      throw new Error('Session expired');
    }
  }

  return response;
}

/**
 * Make an authenticated API request and parse JSON
 *
 * @param {string} url - API endpoint URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiRequestJson(url, options = {}) {
  const response = await apiRequest(url, options);
  return response.json();
}

/**
 * Get current user from localStorage
 * @returns {Object|null} User object or null
 */
function getCurrentUser() {
  const userJson = localStorage.getItem('user');
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
function isAuthenticated() {
  return !!localStorage.getItem('auth_token');
}

/**
 * Check if user has admin role
 * @returns {boolean} True if admin
 */
function isAdmin() {
  const user = getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Require authentication, redirect to login if not authenticated
 * @param {string} redirectPath - Path to redirect after login
 */
function requireAuth(redirectPath = null) {
  if (!isAuthenticated()) {
    const redirect = redirectPath || location.pathname;
    location.href = `/login.html?redirect=${encodeURIComponent(redirect)}`;
    return false;
  }
  return true;
}

/**
 * Require admin role, redirect if not admin
 * @param {string} redirectPath - Path to redirect if not admin
 */
function requireAdmin(redirectPath = '/') {
  if (!requireAuth()) {
    return false;
  }

  if (!isAdmin()) {
    alert('需要管理员权限访问此页面');
    location.href = redirectPath;
    return false;
  }

  return true;
}

// Export for use in other scripts
window.apiClient = {
  request: apiRequest,
  requestJson: apiRequestJson,
  refreshToken: refreshAccessToken,
  logout,
  getCurrentUser,
  isAuthenticated,
  isAdmin,
  requireAuth,
  requireAdmin,
};
