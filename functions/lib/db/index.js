/**
 * Database Abstraction Layer
 * Provides a unified interface for different database platforms
 */

import { D1Adapter } from './adapters/d1.js'
import { PostgresAdapter } from './adapters/postgres.js'

/**
 * Create a database adapter based on the environment
 * @param {Object} env - Environment variables and bindings
 * @returns {D1Adapter|PostgresAdapter} Database adapter instance
 */
export function createDatabase(env) {
  // Check for Cloudflare D1 binding
  if (env.DB && typeof env.DB.prepare === 'function') {
    return new D1Adapter(env.DB)
  }

  // Check for PostgreSQL connection
  if (env.DATABASE_URL || env.DB_CLIENT) {
    // If pg Pool is already provided (Node.js/Express)
    if (env.DB_CLIENT) {
      return new PostgresAdapter(env.DB_CLIENT)
    }

    // Otherwise, create a new connection (not recommended for serverless)
    // This is mainly for testing purposes
    if (typeof process !== 'undefined' && process.env.DATABASE_URL) {
      throw new Error('PostgreSQL connection pool must be provided via env.DB_CLIENT')
    }
  }

  throw new Error('No database configured. Please set up D1 binding or DATABASE_URL.')
}

/**
 * Check if a database is configured
 * @param {Object} env - Environment variables and bindings
 * @returns {boolean}
 */
export function hasDatabase(env) {
  return !!(
    (env.DB && typeof env.DB.prepare === 'function') ||
    env.DATABASE_URL ||
    env.DB_CLIENT
  )
}

/**
 * Get the database platform type
 * @param {Object} env - Environment variables and bindings
 * @returns {string} 'd1', 'postgresql', or 'none'
 */
export function getDatabasePlatform(env) {
  if (env.DB && typeof env.DB.prepare === 'function') {
    return 'd1'
  }
  if (env.DATABASE_URL || env.DB_CLIENT) {
    return 'postgresql'
  }
  return 'none'
}

// Re-export adapters for direct use if needed
export { D1Adapter, PostgresAdapter }
