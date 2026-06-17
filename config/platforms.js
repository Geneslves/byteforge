/**
 * Platform Configuration
 * Manages multi-platform deployment settings
 */

export const platformConfig = {
  cloudflare: {
    name: 'Cloudflare Pages',
    database: 'd1',
    runtime: 'workers',
    deployment: 'wrangler deploy',
    features: {
      edgeFunctions: true,
      serverless: true,
      cdn: true,
      kv: true,
      d1: true
    }
  },
  nodejs: {
    name: 'Node.js/Express',
    database: 'postgresql',
    runtime: 'node',
    deployment: 'docker compose up',
    features: {
      edgeFunctions: false,
      serverless: false,
      cdn: false,
      kv: false,
      d1: false
    }
  },
  vercel: {
    name: 'Vercel',
    database: 'vercel-postgres',
    runtime: 'serverless',
    deployment: 'vercel deploy',
    features: {
      edgeFunctions: true,
      serverless: true,
      cdn: true,
      kv: true,
      d1: false
    }
  }
}

/**
 * Detect current platform
 * @returns {string} Platform name ('cloudflare', 'nodejs', 'vercel')
 */
export function detectPlatform() {
  // Cloudflare Pages/Workers
  if (process.env.CF_PAGES || globalThis.CF_PAGES) {
    return 'cloudflare'
  }

  // Vercel
  if (process.env.VERCEL) {
    return 'vercel'
  }

  // Default to Node.js
  return 'nodejs'
}

/**
 * Get current platform configuration
 * @returns {Object} Platform config object
 */
export function getPlatformConfig() {
  const platform = detectPlatform()
  return {
    platform,
    ...platformConfig[platform]
  }
}

/**
 * Check if feature is supported on current platform
 * @param {string} feature - Feature name
 * @returns {boolean} True if feature is supported
 */
export function isFeatureSupported(feature) {
  const config = getPlatformConfig()
  return config.features[feature] || false
}

/**
 * Get database type for current platform
 * @returns {string} Database type ('d1', 'postgresql', 'vercel-postgres')
 */
export function getDatabaseType() {
  const config = getPlatformConfig()
  return config.database
}

/**
 * Get deployment command for current platform
 * @returns {string} Deployment command
 */
export function getDeploymentCommand() {
  const config = getPlatformConfig()
  return config.deployment
}

/**
 * Platform-specific environment setup
 * @returns {Object} Environment variables for current platform
 */
export function setupEnvironment() {
  const platform = detectPlatform()

  switch (platform) {
    case 'cloudflare':
      return {
        PLATFORM: 'cloudflare',
        DATABASE_TYPE: 'd1',
        RUNTIME: 'workers'
      }

    case 'nodejs':
      return {
        PLATFORM: 'nodejs',
        DATABASE_TYPE: 'postgresql',
        RUNTIME: 'node'
      }

    case 'vercel':
      return {
        PLATFORM: 'vercel',
        DATABASE_TYPE: 'vercel-postgres',
        RUNTIME: 'serverless'
      }

    default:
      return {
        PLATFORM: 'unknown',
        DATABASE_TYPE: 'unknown',
        RUNTIME: 'unknown'
      }
  }
}

export default {
  platformConfig,
  detectPlatform,
  getPlatformConfig,
  isFeatureSupported,
  getDatabaseType,
  getDeploymentCommand,
  setupEnvironment
}
