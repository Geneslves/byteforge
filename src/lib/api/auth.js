/**
 * Auth API - 认证相关的 API 调用
 */

import { api } from './client.js'

/**
 * 用户登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<{token: string, user: Object}>}
 */
export async function login(username, password) {
  const response = await api.post('/api/auth/login', {
    username,
    password
  })

  // 保存 token 和用户信息
  if (response.ok && response.token) {
    localStorage.setItem('auth_token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
  }

  return response
}

/**
 * 用户注册
 * @param {string} username - 用户名
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @returns {Promise<{token: string, user: Object}>}
 */
export async function register(username, email, password) {
  const response = await api.post('/api/auth/register', {
    username,
    email,
    password
  })

  // 保存 token 和用户信息
  if (response.ok && response.token) {
    localStorage.setItem('auth_token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
  }

  return response
}

/**
 * 获取当前用户信息
 * @returns {Promise<{user: Object}>}
 */
export async function getCurrentUser() {
  return api.get('/api/auth/me')
}

/**
 * 刷新访问令牌
 * @param {string} refreshToken - 刷新令牌
 * @returns {Promise<{token: string}>}
 */
export async function refreshAccessToken(refreshToken) {
  const response = await api.post('/api/v1/auth/refresh', {
    refreshToken
  })

  // 更新 token
  if (response.ok && response.token) {
    localStorage.setItem('auth_token', response.token)
  }

  return response
}

/**
 * 用户登出
 * @param {boolean} redirect - 是否重定向到登录页
 */
export function logout(redirect = true) {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  localStorage.removeItem('refresh_token')

  if (redirect) {
    window.location.href = '/pages/login.html'
  }
}

/**
 * 检查用户是否已登录
 * @returns {boolean}
 */
export function isAuthenticated() {
  const token = localStorage.getItem('auth_token')
  const user = localStorage.getItem('user')
  return !!(token && user)
}

/**
 * 获取当前登录的用户信息（从 localStorage）
 * @returns {Object|null}
 */
export function getStoredUser() {
  const userStr = localStorage.getItem('user')
  if (!userStr) return null

  try {
    return JSON.parse(userStr)
  } catch (error) {
    console.error('Failed to parse user data:', error)
    return null
  }
}

/**
 * 检查用户是否为管理员
 * @returns {boolean}
 */
export function isAdmin() {
  const user = getStoredUser()
  return user?.role === 'admin'
}

/**
 * 获取当前的认证 token
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem('auth_token')
}
