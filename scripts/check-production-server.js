import { spawn } from 'node:child_process'

const port = 32000 + Math.floor(Math.random() * 1000)
const baseUrl = `http://127.0.0.1:${port}`
const canonicalOrigin = 'https://www.thebyte.tech'
const output = []

const server = spawn(process.execPath, ['server/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    PGHOST: '127.0.0.1',
    PGPORT: '1',
    PGUSER: 'healthcheck',
    PGPASSWORD: 'healthcheck',
    PGDATABASE: 'healthcheck',
    SITE_URL: canonicalOrigin,
    SITE_ORIGIN: canonicalOrigin,
    ALLOWED_ORIGINS: canonicalOrigin,
    REGISTRATION_ENABLED: 'false',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

server.stdout.on('data', (chunk) => output.push(chunk.toString()))
server.stderr.on('data', (chunk) => output.push(chunk.toString()))

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const waitForLive = async () => {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health/live`)
      if (response.ok) return
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('Timed out waiting for Express liveness endpoint')
}

try {
  await waitForLive()

  const live = await fetch(`${baseUrl}/api/health/live`, {
    headers: { Origin: canonicalOrigin },
  })
  assert(live.status === 200, `live endpoint returned ${live.status}`)
  assert(live.headers.get('access-control-allow-origin') === canonicalOrigin, 'canonical CORS origin was not allowed')
  assert(!live.headers.has('x-powered-by'), 'X-Powered-By must be disabled')
  assert(live.headers.has('content-security-policy-report-only'), 'CSP Report-Only header is missing')
  assert(live.headers.has('strict-transport-security'), 'HSTS header is missing')
  assert(live.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options is missing')
  assert(live.headers.has('referrer-policy'), 'Referrer-Policy is missing')
  assert(live.headers.has('permissions-policy'), 'Permissions-Policy is missing')

  const rejectedOrigin = await fetch(`${baseUrl}/api/health/live`, {
    headers: { Origin: 'https://attacker.example' },
  })
  assert(rejectedOrigin.status === 403, `untrusted CORS origin returned ${rejectedOrigin.status}`)

  const ready = await fetch(`${baseUrl}/api/health/ready`)
  assert(ready.status === 503, `ready endpoint should fail without PostgreSQL, got ${ready.status}`)

  const missingApi = await fetch(`${baseUrl}/api/does-not-exist`)
  assert(missingApi.status === 404, `missing API returned ${missingApi.status}`)
  assert((await missingApi.json()).error === 'not_found', 'missing API did not return JSON not_found')

  const missingPage = await fetch(`${baseUrl}/does-not-exist`)
  const missingHtml = await missingPage.text()
  assert(missingPage.status === 404, `missing page returned ${missingPage.status}`)
  assert(missingPage.headers.get('content-type')?.includes('text/html'), 'missing page is not HTML')
  assert(missingHtml.includes('noindex, nofollow'), '404 page must be noindex')

  const knownRoute = await fetch(`${baseUrl}/logs/`)
  assert(knownRoute.status === 200, `known SPA route returned ${knownRoute.status}`)

  const registrationStatus = await fetch(`${baseUrl}/api/auth/registration-status`)
  assert((await registrationStatus.json()).enabled === false, 'public registration should default to disabled')

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'security-check',
      email: 'security-check@example.test',
      password: 'NotUsedBecauseRegistrationIsDisabled1!',
    }),
  })
  assert(registration.status === 403, `disabled registration returned ${registration.status}`)

  let limitedStatus
  for (let attempt = 1; attempt <= 11; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.10',
      },
      body: JSON.stringify({ username: 'rate-limit-check', password: 'InvalidPassword1!' }),
    })
    if (attempt === 11) limitedStatus = response.status
  }
  assert(limitedStatus === 429, `strict auth limiter returned ${limitedStatus} on attempt 11`)

  console.log('Production server check passed: hard 404s, health split, CORS, headers, registration gate, and auth limiting.')
} catch (error) {
  console.error(output.join(''))
  throw error
} finally {
  server.kill('SIGTERM')
}
