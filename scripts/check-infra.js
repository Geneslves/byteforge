import { existsSync, readFileSync } from 'node:fs'

const errors = []

const read = (path) => {
  if (!existsSync(path)) {
    errors.push(`missing infrastructure file: ${path}`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

const expect = (source, snippet, message) => {
  if (!source.includes(snippet)) errors.push(message)
}

const packageJson = JSON.parse(read('package.json'))
if (packageJson.packageManager !== 'pnpm@10.33.0') {
  errors.push('packageManager must pin pnpm@10.33.0')
}
if (packageJson.engines?.node !== '22.x' || packageJson.engines?.pnpm !== '10.33.0') {
  errors.push('package engines must pin Node 22 and pnpm 10.33.0')
}
if (packageJson.pnpm?.overrides) {
  errors.push('dependency overrides must live in pnpm-workspace.yaml')
}

const workspace = read('pnpm-workspace.yaml')
for (const dependency of ['esbuild: 0.28.1', 'undici: 7.28.0', 'ws: 8.21.0']) {
  expect(workspace, dependency, `pnpm-workspace.yaml missing override: ${dependency}`)
}

const dockerfile = read('Dockerfile')
for (const snippet of [
  'ARG NODE_VERSION=22.23.1',
  'corepack prepare pnpm@10.33.0 --activate',
  'pnpm install --frozen-lockfile',
  'pnpm install --prod --frozen-lockfile',
  'USER node',
  '/api/health/ready',
]) {
  expect(dockerfile, snippet, `Dockerfile missing fixed-runtime behavior: ${snippet}`)
}
if (dockerfile.includes('npm install -g pnpm')) {
  errors.push('Dockerfile must not install floating global pnpm')
}

const compose = read('infra/docker-compose.prod.yml')
for (const snippet of [
  'postgres:15.18-alpine',
  '127.0.0.1:${BYTEFORGE_HTTP_PORT',
  'BYTEFORGE_IMAGE is required',
  'byteforge-${DEPLOY_ENV}-postgres-data',
  '/api/health/ready',
  'no-new-privileges:true',
]) {
  expect(compose, snippet, `production Compose missing: ${snippet}`)
}
if (/5432:5432/.test(compose)) {
  errors.push('production Compose must not publish PostgreSQL')
}

const caddy = read('infra/Caddyfile')
for (const snippet of [
  'thebyte.tech {',
  'www.thebyte.tech {',
  'staging.thebyte.tech {',
  'X-Robots-Tag "noindex',
  'health_uri /api/health/ready',
]) {
  expect(caddy, snippet, `Caddyfile missing: ${snippet}`)
}

for (const path of [
  'infra/scripts/bootstrap.sh',
  'infra/scripts/deploy.sh',
  'infra/scripts/rollback.sh',
  'infra/scripts/smoke.sh',
  'infra/scripts/ci-deploy.sh',
  'infra/backup/postgres-backup.sh',
  'infra/systemd/byteforge@.service',
  'infra/systemd/byteforge-backup@.service',
  'infra/systemd/byteforge-backup@.timer',
  'infra/env/staging.env.example',
  'infra/env/production.env.example',
]) {
  read(path)
}

const ci = read('.github/workflows/ci.yml')
expect(ci, 'pnpm install --frozen-lockfile', 'CI must install frozen dependencies')
expect(ci, 'pnpm run check', 'CI must run the project check suite')
expect(ci, 'docker build', 'CI must build the production image')

const release = read('.github/workflows/release.yml')
for (const snippet of [
  'packages: write',
  'docker/build-push-action@v6',
  'deploy_staging:',
  'needs: [publish, deploy_staging]',
  'name: production',
  'ci-smoke-or-rollback.sh',
]) {
  expect(release, snippet, `release workflow missing: ${snippet}`)
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`)
  process.exit(1)
}

console.log('Infrastructure check passed: fixed toolchain, production Compose, Caddy, backups, rollback, and staged CI/CD.')
