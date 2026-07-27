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
  "!req.path.startsWith('/api/health')",
  'healthcheck requests should be skipped in regular request logs'
);
expectIncludes(
  serverModule,
  "app.get('/api/health/ready', ready)",
  'readiness requests should use an explicit API route before the SPA fallback'
);
expectIncludes(
  serverModule,
  'res.status(503).json({',
  'failed readiness checks should return a JSON 503 response'
);

const effectsModule = readFileSync('src/modules/effects.js', 'utf8');
const ambientCanvasModule = readFileSync('src/modules/ambient-canvas.js', 'utf8');
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
  'initMotionBudget',
  'homepage effects should apply a bounded ambient motion profile'
);
expectIncludes(
  effectsModule,
  "document.addEventListener('visibilitychange'",
  'homepage animations should pause while the page is hidden'
);
expectNotIncludes(
  effectsModule,
  'initParallax(hub);',
  'pointer movement should not continuously transform full-page layers'
);
expectIncludes(
  effectsModule,
  'initAmbientCanvas(hub',
  'homepage effects should use the consolidated canvas renderer'
);
expectIncludes(
  ambientCanvasModule,
  "requestAnimationFrame(tick)",
  'ambient canvas should use one coordinated animation loop'
);
expectIncludes(
  ambientCanvasModule,
  'pixelRatioCap',
  'ambient canvas should cap backing-store resolution'
);
expectIncludes(
  ambientCanvasModule,
  "document.addEventListener('visibilitychange'",
  'ambient canvas should stop when the page is hidden'
);
expectIncludes(
  ambientCanvasModule,
  'cadence.renderStride',
  'ambient canvas should use refresh-synchronized frame strides'
);
expectIncludes(
  ambientCanvasModule,
  'meteorEvents',
  'ambient canvas should expose recurring meteor diagnostics'
);
expectIncludes(
  ambientCanvasModule,
  'meteor.thickness * 4.2',
  'meteors should render a visible outer trail'
);
expectIncludes(
  ambientCanvasModule,
  'STAR_BASE_PULSE = 0.24',
  'ambient stars should retain a visible baseline between twinkles'
);
expectIncludes(
  ambientCanvasModule,
  'particle.size * 2',
  'inbound particles should render a visible glow trail'
);
expectIncludes(
  ambientCanvasModule,
  'PARTICLE_ACTIVE_WINDOW = 0.105',
  'inbound particles should stay sparse and independently staggered'
);
expectIncludes(
  effectsModule,
  "classList.remove('is-performance-lite')",
  'performance-lite mode should end after boot so ambient animations resume'
);
expectIncludes(
  effectsModule,
  "layer.style.setProperty(\n      `--parallax-${name}`",
  'parallax variables should update only their consuming layer'
);
expectNotIncludes(
  effectsModule,
  "hub.style.setProperty(\n      `--parallax-${name}`",
  'parallax updates should not invalidate the full homepage subtree'
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
expectIncludes(
  styleSheet,
  '.hub-v2.is-boot-complete:not(.is-route-return) .lightfield',
  'boot-complete mode should keep the center lightfield from replaying its reveal animation'
);
expectIncludes(
  styleSheet,
  '.hub-v2.is-boot-complete:not(.is-route-return) .hotspot',
  'boot-complete mode should keep the center hotspot from replaying its ignition animation'
);
expectIncludes(
  styleSheet,
  '--planet-hit-size: 52px;',
  'planet controls should expose a stable 52px hit target'
);
expectIncludes(
  styleSheet,
  'animation-play-state: paused;',
  'planet orbits should pause immediately while hovered or focused'
);
expectIncludes(
  styleSheet,
  '.hub-v2.is-ambient-canvas .datafield',
  'canvas mode should disable the legacy data-stream DOM layer'
);
expectIncludes(
  styleSheet,
  '.hub-v2.is-ambient-canvas .stage',
  'canvas mode should disable the legacy particle DOM layer'
);
expectIncludes(
  styleSheet,
  '.hub-v2.is-page-hidden *',
  'hidden pages should pause CSS animations'
);
expectNotIncludes(
  styleSheet,
  'backdrop-filter: blur(8px);',
  'moving planet labels should not allocate backdrop-filter surfaces'
);

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log('Performance check passed: audio, cache, logging, and first-load effects are optimized.');
