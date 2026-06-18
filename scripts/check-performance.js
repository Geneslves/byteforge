import { readFileSync } from 'node:fs';

const errors = [];

const expectIncludes = (source, snippet, message) => {
  if (!source.includes(snippet)) errors.push(message);
};

const expectNotIncludes = (source, snippet, message) => {
  if (source.includes(snippet)) errors.push(message);
};

const audioModule = readFileSync('src/modules/audio.js', 'utf8');
expectIncludes(
  audioModule,
  "localStorage.getItem(AUDIO_KEY) === '1'",
  'audio should be opt-in instead of enabled by default'
);
expectIncludes(
  audioModule,
  "audio.preload = 'none'",
  'audio should not preload the 3.4MB mp3 during first paint'
);
expectIncludes(
  audioModule,
  'const ensureAudio',
  'audio object should be created lazily after user intent'
);
expectNotIncludes(
  audioModule,
  'const audio = new Audio(AUDIO_SRC);',
  'audio object should not be constructed eagerly on boot'
);
expectNotIncludes(
  audioModule,
  'autoplayOnInteraction',
  'audio playback should not be attempted automatically on boot'
);

const serverModule = readFileSync('server/index.js', 'utf8');
expectIncludes(
  serverModule,
  "maxAge: '1y'",
  'hashed/static assets should receive a long cache lifetime'
);
expectIncludes(
  serverModule,
  'immutable: true',
  'hashed/static assets should be marked immutable'
);
expectIncludes(
  serverModule,
  "req.path !== '/api/health'",
  'healthcheck requests should be skipped in regular request logs'
);

const effectsModule = readFileSync('src/modules/effects.js', 'utf8');
expectIncludes(
  effectsModule,
  'requestIdleCallback',
  'meteor effects should be deferred until idle time'
);
expectIncludes(
  effectsModule,
  'is-boot-complete',
  'boot overlay should be removed after its exit animation'
);
expectIncludes(
  effectsModule,
  "classList.remove('is-performance-lite')",
  'performance-lite mode should end after boot so ambient animations resume'
);

const styleSheet = readFileSync('src/styles/style.css', 'utf8');
expectIncludes(
  styleSheet,
  '.hub-v2.is-performance-lite',
  'homepage styles should expose a performance-lite first-load mode'
);
expectIncludes(
  styleSheet,
  '.hub-v2.is-performance-lite .boot-sequence',
  'performance-lite mode should shorten or bypass the boot overlay'
);
expectIncludes(
  styleSheet,
  '.hub-v2.is-boot-complete .boot-sequence',
  'boot overlay should stop participating in rendering after completion'
);
expectIncludes(
  styleSheet,
  '.hub-v2.is-performance-lite .stream-track',
  'performance-lite mode should freeze continuous data stream animation'
);
expectIncludes(
  styleSheet,
  '.hub-v2.is-performance-lite .star-glint',
  'performance-lite mode should freeze continuous star glint animation'
);
expectIncludes(
  styleSheet,
  '.hub-v2.is-performance-lite .edge-particle',
  'performance-lite mode should disable continuous stage particle animation'
);
expectIncludes(
  styleSheet,
  '.hub-v2.is-performance-lite .lightfield',
  'performance-lite mode should freeze continuous lightfield animation'
);

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log('Performance check passed: audio, cache, logging, and first-load effects are optimized.');
