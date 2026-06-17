/**
 * Schema Validation Helper
 * Provides simple schema-based validation for request bodies
 */

/**
 * Validate data against a schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @returns {{valid: boolean, error?: string}}
 */
export function validateSchema(data, schema) {
  if (!data) {
    return { valid: false, error: 'Request body is required' }
  }

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]

    // Determine if field is required (default: true)
    const required = typeof rules === 'string' || rules.required !== false

    // Required check
    if (required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: `Field '${field}' is required` }
    }

    // Skip further validation if field is not present and not required
    if (value === undefined || value === null) {
      continue
    }

    // Get type and other rules
    const type = typeof rules === 'string' ? rules : rules.type
    const constraints = typeof rules === 'object' ? rules : {}

    // Type validation
    if (type === 'string' && typeof value !== 'string') {
      return { valid: false, error: `Field '${field}' must be a string` }
    }
    if (type === 'number' && typeof value !== 'number') {
      return { valid: false, error: `Field '${field}' must be a number` }
    }
    if (type === 'boolean' && typeof value !== 'boolean') {
      return { valid: false, error: `Field '${field}' must be a boolean` }
    }
    if (type === 'array' && !Array.isArray(value)) {
      return { valid: false, error: `Field '${field}' must be an array` }
    }
    if (type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      return { valid: false, error: `Field '${field}' must be an object` }
    }

    // String constraints
    if (type === 'string') {
      if (constraints.min && value.length < constraints.min) {
        return {
          valid: false,
          error: `Field '${field}' must be at least ${constraints.min} characters`
        }
      }
      if (constraints.max && value.length > constraints.max) {
        return {
          valid: false,
          error: `Field '${field}' must be at most ${constraints.max} characters`
        }
      }
      if (constraints.pattern && !constraints.pattern.test(value)) {
        return {
          valid: false,
          error: `Field '${field}' format is invalid`
        }
      }
    }

    // Number constraints
    if (type === 'number') {
      if (constraints.min !== undefined && value < constraints.min) {
        return {
          valid: false,
          error: `Field '${field}' must be at least ${constraints.min}`
        }
      }
      if (constraints.max !== undefined && value > constraints.max) {
        return {
          valid: false,
          error: `Field '${field}' must be at most ${constraints.max}`
        }
      }
    }

    // Array constraints
    if (type === 'array') {
      if (constraints.minLength !== undefined && value.length < constraints.minLength) {
        return {
          valid: false,
          error: `Field '${field}' must have at least ${constraints.minLength} items`
        }
      }
      if (constraints.maxLength !== undefined && value.length > constraints.maxLength) {
        return {
          valid: false,
          error: `Field '${field}' must have at most ${constraints.maxLength} items`
        }
      }
    }

    // Enum validation
    if (constraints.enum && !constraints.enum.includes(value)) {
      return {
        valid: false,
        error: `Field '${field}' must be one of: ${constraints.enum.join(', ')}`
      }
    }

    // Custom validator
    if (constraints.validator && typeof constraints.validator === 'function') {
      const customResult = constraints.validator(value)
      if (customResult !== true) {
        return {
          valid: false,
          error: typeof customResult === 'string' ? customResult : `Field '${field}' is invalid`
        }
      }
    }
  }

  return { valid: true }
}

/**
 * Common validators for reuse
 */
export const validators = {
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value) || 'Invalid email format'
  },

  username: (value) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    return usernameRegex.test(value) || 'Username must be 3-20 characters (alphanumeric and underscore only)'
  },

  url: (value) => {
    try {
      new URL(value)
      return true
    } catch {
      return 'Invalid URL format'
    }
  },

  uuid: (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(value) || 'Invalid UUID format'
  }
}
