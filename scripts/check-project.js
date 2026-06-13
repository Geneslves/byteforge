import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'public/audio/ink-wash-terminal.mp3',
  'src/data/content.js',
  'src/modules/audio.js',
  'src/modules/dom.js',
  'src/modules/effects.js',
  'src/modules/planets.js',
  'src/modules/routing.js',
  'src/modules/theme.js',
  'scripts/clean.js',
  'scripts/check-source.js',
  'scripts/check-static.js',
  'scripts/check-visual.js',
  'src/styles/effects.css',
  'src/styles/style.css',
  'src/styles/themes.css',
];

const forbiddenFiles = [
  'Ink_Wash_Terminal.mp3',
  'src/content.js',
  'src/effects.css',
  'src/style.css',
  'src/themes.css',
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
if (!html.includes('aria-pressed="true"')) {
  errors.push('audio toggle should declare aria-pressed="true" by default');
}

const audioModule = readFileSync('src/modules/audio.js', 'utf8');
for (const requiredSnippet of [
  "const AUDIO_SRC = '/audio/ink-wash-terminal.mp3'",
  "const AUDIO_KEY = 'byteforge:audio-enabled'",
  "localStorage.getItem(AUDIO_KEY) !== '0'",
  'audio.loop = true',
  'audio.play()',
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
  check: 'pnpm run check:project && pnpm build && pnpm run check:routes && pnpm run check:static && pnpm run check:source && pnpm run check:visual',
  'check:source': 'node scripts/check-source.js',
  'check:static': 'node scripts/check-static.js',
  'check:visual': 'node scripts/check-visual.js',
  audit: 'pnpm audit --registry=https://registry.npmjs.org --audit-level=moderate',
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
