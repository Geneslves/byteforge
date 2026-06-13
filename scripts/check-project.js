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
  'audio.loop = true',
  'audio.play()',
  'aria-pressed',
]) {
  if (!audioModule.includes(requiredSnippet)) {
    errors.push(`audio module is missing behavior marker: ${requiredSnippet}`);
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
