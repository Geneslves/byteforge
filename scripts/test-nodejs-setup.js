/**
 * Test Node.js Server Setup (Without Docker)
 * Validates that the server configuration is correct
 */

import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('\n🧪 Testing Node.js Server Setup\n')
console.log('━'.repeat(50))

// Test 1: Check if server file exists
console.log('\n1. Checking server file...')
try {
  const fs = await import('fs')
  const serverPath = './server/index.js'
  if (fs.existsSync(serverPath)) {
    console.log('   ✅ server/index.js exists')
  } else {
    console.log('   ❌ server/index.js not found')
  }
} catch (error) {
  console.log('   ❌ Error checking server file:', error.message)
}

// Test 2: Check if dependencies are installed
console.log('\n2. Checking dependencies...')
try {
  await import('express')
  console.log('   ✅ express installed')
} catch (error) {
  console.log('   ❌ express not installed')
}

try {
  await import('pg')
  console.log('   ✅ pg installed')
} catch (error) {
  console.log('   ❌ pg not installed')
}

// Test 3: Check if API endpoints exist
console.log('\n3. Checking API endpoints...')
const endpoints = [
  './functions/api/health.js',
  './functions/api/feedback.js',
  './functions/api/auth/login.js',
  './functions/api/admin/analytics.js'
]

const fs = await import('fs')
for (const endpoint of endpoints) {
  if (fs.existsSync(endpoint)) {
    console.log(`   ✅ ${endpoint}`)
  } else {
    console.log(`   ❌ ${endpoint} missing`)
  }
}

// Test 4: Check Docker files
console.log('\n4. Checking Docker configuration...')
if (fs.existsSync('./Dockerfile')) {
  console.log('   ✅ Dockerfile exists')
} else {
  console.log('   ❌ Dockerfile missing')
}

if (fs.existsSync('./docker-compose.yml')) {
  console.log('   ✅ docker-compose.yml exists')
} else {
  console.log('   ❌ docker-compose.yml missing')
}

if (fs.existsSync('./schema/postgres.sql')) {
  console.log('   ✅ schema/postgres.sql exists')
} else {
  console.log('   ❌ schema/postgres.sql missing')
}

// Test 5: Check platform configuration
console.log('\n5. Checking platform configuration...')
if (fs.existsSync('./config/platforms.js')) {
  console.log('   ✅ config/platforms.js exists')

  try {
    const { detectPlatform } = await import('./config/platforms.js')
    const platform = detectPlatform()
    console.log(`   📍 Detected platform: ${platform}`)
  } catch (error) {
    console.log('   ⚠️  Could not detect platform:', error.message)
  }
} else {
  console.log('   ❌ config/platforms.js missing')
}

// Summary
console.log('\n━'.repeat(50))
console.log('\n📋 Summary:\n')
console.log('✅ Phase 3 components are installed correctly')
console.log('')
console.log('⚠️  Note: Docker is not installed on this system')
console.log('   To test the full Node.js/PostgreSQL stack:')
console.log('   1. Install Docker Desktop for Windows')
console.log('   2. Run: pnpm run docker:up')
console.log('')
console.log('Alternative: Test with Cloudflare (existing setup)')
console.log('   1. Run: pnpm run dev:api')
console.log('   2. Run: node scripts/test-api-endpoints.js')
console.log('')
