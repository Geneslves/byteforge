import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'runtime/logs/.gitkeep',
  'runtime/tmp/.gitkeep',
  'runtime/backups/.gitkeep',
  'public/audio/ink-wash-terminal.mp3',
  'public/pages/nav.html',
  'public/pages/login.html',
  'public/pages/admin.html',
  'public/pages/profile.html',
  'public/pages/account.html',
  'public/pages/notifications.html',
  'public/pages/help.html',
  'public/pages/about.html',
  'public/pages/contact.html',
  'public/images/ink-horizon.svg',
  'public/styles/ink-sci-fi.css',
  'public/styles/pages.css',
  'public/scripts/pages.js',
  'src/data/index.js',
  'src/data/content-model.js',
  'src/data/routes.js',
  'src/data/planets.js',
  'src/data/collections/logs.js',
  'src/data/collections/deployments.js',
  'src/data/collections/archive.js',
  'src/data/collections/dev-ai.js',
  'src/data/collections/snippets.js',
  'src/data/collections/academic.js',
  'src/modules/audio.js',
  'src/modules/dom.js',
  'src/modules/effects.js',
  'src/modules/planets.js',
  'src/modules/routing.js',
  'src/modules/theme.js',
  'scripts/clean.js',
  'scripts/create-deploy-env.js',
  'scripts/api/integration-local.js',
  'scripts/db/reset-local.js',
  'scripts/db/seed-local.js',
  'scripts/check-source.js',
  'scripts/check-static.js',
  'scripts/check-visual.js',
  'scripts/check-content.js',
  'scripts/check-backend.js',
  'scripts/check-performance.js',
  'src/styles/effects.css',
  'src/styles/style.css',
  'src/styles/themes.css',
  'schema/d1.sql',
  'functions/_middleware.js',
  'functions/api/health.js',
  'functions/api/feedback.js',
  'functions/api/content-events.js',
  'wrangler.toml',
];

const forbiddenFiles = [
  'Ink_Wash_Terminal.mp3',
  '.vite-dev.err.log',
  '.vite-dev.out.log',
  'dev-server.err.log',
  'dev-server.out.log',
  'preview-server.err.log',
  'preview-server.out.log',
  'src/content.js',
  'src/data/content.js',
  'src/effects.css',
  'src/style.css',
  'src/themes.css',
  'functions/api/_middleware.js',
  'functions/api/__middleware.js',
];

const errors = [];

for (const filePath of requiredFiles) {
  if (!existsSync(filePath)) errors.push(`missing required file: ${filePath}`);
}

for (const filePath of forbiddenFiles) {
  if (existsSync(filePath)) errors.push(`legacy file should be moved or removed: ${filePath}`);
}

const html = readFileSync('index.html', 'utf8');
for (const legacyHref of ['/src/style.css', '/src/themes.css', '/src/effects.css']) {
  if (html.includes(legacyHref)) errors.push(`index.html should not link legacy stylesheet: ${legacyHref}`);
}

for (const styleHref of ['/src/styles/themes.css', '/src/styles/style.css', '/src/styles/effects.css']) {
  if (!html.includes(`rel="stylesheet" href="${styleHref}"`)) {
    errors.push(`index.html should load stylesheet before app boot: ${styleHref}`);
  }
}

const appScriptIndex = html.indexOf('src="/src/main.js"');
const lastStyleIndex = Math.max(
  html.indexOf('href="/src/styles/themes.css"'),
  html.indexOf('href="/src/styles/style.css"'),
  html.indexOf('href="/src/styles/effects.css"')
);
if (appScriptIndex !== -1 && lastStyleIndex !== -1 && lastStyleIndex > appScriptIndex) {
  errors.push('stylesheet links must appear before the application module script');
}

if (!html.includes('data-audio-toggle')) {
  errors.push('index.html is missing the audio toggle control');
}
if (!html.includes('aria-pressed="false"')) {
  errors.push('audio toggle should declare aria-pressed="false" by default');
}

const audioModule = readFileSync('src/modules/audio.js', 'utf8');
for (const requiredSnippet of [
  "const AUDIO_SRC = '/audio/ink-wash-terminal.mp3'",
  "const AUDIO_KEY = 'byteforge:audio-enabled'",
  "localStorage.getItem(AUDIO_KEY) === '1'",
  'const ensureAudio',
  "audio.preload = 'none'",
  'audio.loop = true',
  'player.play()',
  'aria-pressed',
]) {
  if (!audioModule.includes(requiredSnippet)) {
    errors.push(`audio module is missing behavior marker: ${requiredSnippet}`);
  }
}

const mainModule = readFileSync('src/main.js', 'utf8');
for (const styleImport of ["import './styles/style.css'", "import './styles/themes.css'", "import './styles/effects.css'"]) {
  if (mainModule.includes(styleImport)) {
    errors.push(`src/main.js should not inject blocking page styles through JavaScript: ${styleImport}`);
  }
}

const ecosystemConfig = readFileSync('ecosystem.config.cjs', 'utf8');
if (!ecosystemConfig.includes('cwd: __dirname')) {
  errors.push('ecosystem.config.cjs should use cwd: __dirname for PM2 apps');
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const requiredScripts = {
  clean: 'node scripts/clean.js',
  'deploy:env': 'node scripts/create-deploy-env.js',
  check: 'node scripts/check-project.js && node scripts/check-content.js && node scripts/build.js && pagefind --site dist --output-subdir pagefind && node scripts/check-routes.js && node scripts/check-static.js && node scripts/check-head.js && node scripts/check-source.js && node scripts/check-visual.js && node scripts/check-auth.js && node scripts/check-backend.js && node scripts/check-production-server.js && node scripts/check-infra.js && node scripts/check-performance.js',
  'api:test:local': 'node scripts/api/integration-local.js',
  'db:reset:local': 'node scripts/db/reset-local.js',
  'db:seed:local': 'node scripts/db/seed-local.js',
  'check:content': 'node scripts/check-content.js',
  'check:source': 'node scripts/check-source.js',
  'check:static': 'node scripts/check-static.js',
  'check:head': 'node scripts/check-head.js',
  'check:visual': 'node scripts/check-visual.js',
  'check:auth': 'node scripts/check-auth.js',
  'check:backend': 'node scripts/check-backend.js',
  'check:production-server': 'node scripts/check-production-server.js',
  'check:infra': 'node scripts/check-infra.js',
  'check:deploy-config': 'node scripts/check-deploy-config.js',
  'check:performance': 'node scripts/check-performance.js',
  audit: 'corepack pnpm audit --registry=https://registry.npmjs.org --audit-level=moderate',
};

for (const [scriptName, expectedCommand] of Object.entries(requiredScripts)) {
  if (pkg.scripts?.[scriptName] !== expectedCommand) {
    errors.push(`package.json script "${scriptName}" should be: ${expectedCommand}`);
  }
}

if (existsSync('dist/index.html') && !existsSync('dist/audio/ink-wash-terminal.mp3')) {
  errors.push('dist is missing audio asset: dist/audio/ink-wash-terminal.mp3');
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`Project structure check passed: ${requiredFiles.length} required files.`);
