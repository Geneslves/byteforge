/**
 * API Client - 统一的 HTTP 请求客户端
 * 提供类型安全的 API 调用接口
 */

class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  /**
   * 通用请求方法
   * @param {string} path - API 路径
   * @param {Object} options - fetch 选项
   * @returns {Promise<Object>} 响应数据
   */
  async request(path, options = {}) {
    const token = localStorage.getItem('auth_token')

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const url = `${this.baseUrl}${path}`

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      const data = await response.json()

      if (!response.ok) {
        throw new ApiError(
          data.error || 'request_failed',
          response.status,
          data.message || `Request failed: ${response.statusText}`,
          data
        )
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      // 网络错误或其他错误
      throw new ApiError(
        'network_error',
        0,
        error.message || 'Network request failed',
        { originalError: error }
      )
    }
  }

  /**
   * GET 请求
   */
  get(path, options = {}) {
    return this.request(path, {
      ...options,
      method: 'GET'
    })
  }

  /**
   * POST 请求
   */
  post(path, data, options = {}) {
    return this.request(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * PATCH 请求
   */
  patch(path, data, options = {}) {
    return this.request(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  /**
   * PUT 请求
   */
  put(path, data, options = {}) {
    return this.request(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  /**
   * DELETE 请求
   */
  delete(path, options = {}) {
    return this.request(path, {
      ...options,
      method: 'DELETE'
    })
  }
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(code, status, message, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }

  /**
   * 检查是否为特定错误类型
   */
  is(code) {
    return this.code === code
  }

  /**
   * 检查是否为认证错误
   */
  isAuthError() {
    return this.status === 401 || this.status === 403
  }

  /**
   * 检查是否为验证错误
   */
  isValidationError() {
    return this.status === 400 || this.code === 'validation_error'
  }

  /**
   * 检查是否为服务器错误
   */
  isServerError() {
    return this.status >= 500
  }
}

// 导出全局实例
export const api = new ApiClient()

// 也导出类以便创建自定义实例
export { ApiClient }
