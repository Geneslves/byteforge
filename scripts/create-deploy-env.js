import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const environment = args.find((arg) => !arg.startsWith('--')) || '';
const force = args.includes('--force');

const randomHex = (bytes) => randomBytes(bytes).toString('hex');

const usage = () => {
  console.error('Usage: node scripts/create-deploy-env.js <staging|production> [--force]');
  process.exit(1);
};

if (!['staging', 'production'].includes(environment)) usage();

const sourcePath = `infra/env/${environment}.env.example`;
const targetPath = `infra/env/${environment}.env`;

if (!existsSync(sourcePath)) {
  console.error(`ERROR missing source env example: ${sourcePath}`);
  process.exit(1);
}

if (existsSync(targetPath) && !force) {
  console.error(`ERROR ${targetPath} already exists; pass --force to replace it`);
  process.exit(1);
}

const postgresPassword = randomHex(24);
const jwtSecret = randomHex(48);

const output = readFileSync(sourcePath, 'utf8')
  .replace(/POSTGRES_PASSWORD=.+/, `POSTGRES_PASSWORD=${postgresPassword}`)
  .replace(/JWT_SECRET=.+/, `JWT_SECRET=${jwtSecret}`);

writeFileSync(targetPath, output);

console.log(`Created ${targetPath}`);
console.log('Review SITE_* and ALLOWED_ORIGINS before deployment.');
console.log(`Validate with: corepack pnpm run check:deploy-config -- ${targetPath}`);
