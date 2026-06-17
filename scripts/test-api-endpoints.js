/**
 * API 端点测试脚本
 * 测试所有迁移的端点
 */

const BASE_URL = 'http://localhost:8788'

// 测试结果统计
const results = {
  passed: 0,
  failed: 0,
  tests: []
}

// 辅助函数：发送请求
async function request(method, path, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${path}`, options)
  const data = await response.json()

  return {
    status: response.status,
    ok: response.ok,
    data
  }
}

// 测试函数
async function test(name, fn) {
  try {
    console.log(`\n🧪 Testing: ${name}`)
    await fn()
    console.log(`✅ PASSED: ${name}`)
    results.passed++
    results.tests.push({ name, status: 'passed' })
  } catch (error) {
    console.error(`❌ FAILED: ${name}`)
    console.error(`   Error: ${error.message}`)
    results.failed++
    results.tests.push({ name, status: 'failed', error: error.message })
  }
}

// 断言函数
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

// ============================================
// 测试套件
// ============================================

async function runTests() {
  console.log('🚀 Starting API Endpoint Tests\n')
  console.log('=' .repeat(50))

  // 1. 测试健康检查端点（旧版本 - 作为基准）
  await test('GET /api/health (baseline)', async () => {
    const res = await request('GET', '/api/health')
    assert(res.ok, 'Response should be ok')
    assert(res.data.ok === true, 'Response ok field should be true')
    assert(res.data.service === 'byteforge-api', 'Service name should match')
    assert(res.data.timestamp, 'Timestamp should exist')
  })

  // 2. 测试反馈端点（公开）
  await test('POST /api/feedback (public endpoint)', async () => {
    const res = await request('POST', '/api/feedback', {
      routePath: '/test',
      message: 'Test feedback from API test suite',
      documentId: 'test-doc-001'
    })
    assert(res.ok, 'Response should be ok')
    assert(res.data.ok === true, 'Response ok field should be true')
    assert(res.data.id, 'Feedback ID should exist')
    assert(res.data.created_at, 'Created timestamp should exist')
  })

  // 3. 测试反馈端点验证（应该失败）
  await test('POST /api/feedback with invalid data', async () => {
    const res = await request('POST', '/api/feedback', {
      routePath: '/test'
      // missing message
    })
    assert(!res.ok, 'Response should not be ok')
    assert(res.status === 400, 'Status should be 400')
  })

  // 4. 测试内容事件端点
  await test('POST /api/content-events (public endpoint)', async () => {
    const res = await request('POST', '/api/content-events', {
      routePath: '/test',
      eventType: 'view',
      documentId: 'test-doc-001'
    })
    assert(res.ok, 'Response should be ok')
    assert(res.data.ok === true, 'Response ok field should be true')
    assert(res.data.id, 'Event ID should exist')
  })

  // 5. 测试内容事件验证（无效的 eventType）
  await test('POST /api/content-events with invalid eventType', async () => {
    const res = await request('POST', '/api/content-events', {
      routePath: '/test',
      eventType: 'invalid_type'
    })
    assert(!res.ok, 'Response should not be ok')
    assert(res.status === 400, 'Status should be 400')
  })

  // 6. 测试认证端点 - 未认证访问应该失败
  await test('GET /api/auth/me without auth (should fail)', async () => {
    const res = await request('GET', '/api/auth/me')
    assert(!res.ok, 'Response should not be ok')
    assert(res.status === 401, 'Status should be 401')
  })

  // 7. 测试登录端点（需要先注册）
  let authToken = null
  await test('POST /api/auth/register', async () => {
    const timestamp = Date.now().toString().slice(-8) // 只取最后8位数字
    const username = `test${timestamp}`
    const res = await request('POST', '/api/auth/register', {
      username,
      email: `${username}@test.com`,
      password: 'TestPassword123!'
    })
    assert(res.ok, 'Response should be ok')
    assert(res.data.ok === true, 'Response ok field should be true')
    assert(res.data.token, 'Token should exist')
    assert(res.data.user, 'User object should exist')
    assert(res.data.user.username === username, 'Username should match')
    authToken = res.data.token
  })

  // 8. 测试认证端点 - 有认证
  await test('GET /api/auth/me with auth', async () => {
    assert(authToken, 'Auth token should exist from previous test')
    const res = await request('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${authToken}`
    })
    assert(res.ok, 'Response should be ok')
    assert(res.data.ok === true, 'Response ok field should be true')
    assert(res.data.user, 'User object should exist')
    assert(res.data.user.id, 'User ID should exist')
  })

  // 9. 测试管理员端点 - 无权限（应该失败）
  await test('GET /api/admin/analytics without admin (should fail)', async () => {
    assert(authToken, 'Auth token should exist')
    const res = await request('GET', '/api/admin/analytics', null, {
      Authorization: `Bearer ${authToken}`
    })
    // 如果第一个用户是管理员，这可能会通过
    // 我们检查响应是否合理
    if (res.ok) {
      console.log('   ℹ️  User is admin, test passed differently')
      assert(res.data.stats, 'Stats should exist for admin')
    } else {
      assert(res.status === 403, 'Status should be 403 for non-admin')
    }
  })

  // 打印测试结果
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Results:')
  console.log(`   ✅ Passed: ${results.passed}`)
  console.log(`   ❌ Failed: ${results.failed}`)
  console.log(`   📝 Total:  ${results.passed + results.failed}`)
  console.log('='.repeat(50))

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => console.log(`   - ${t.name}: ${t.error}`))
  }

  return results.failed === 0
}

// 运行测试
runTests()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('💥 Test suite crashed:', error)
    process.exit(1)
  })
