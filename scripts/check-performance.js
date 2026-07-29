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
const planetsModule = readFileSync('src/modules/planets.js', 'utf8');
const routingModule = readFileSync('src/modules/routing.js', 'utf8');
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
  'renderStride: 1',
  'ambient canvas should begin without dropping startup frames'
);
expectIncludes(
  ambientCanvasModule,
  'Math.round(cadence.refreshFps / targetCanvasFps)',
  'ambient rendering should use an even refresh-synchronized cadence'
);
expectNotIncludes(
  ambientCanvasModule,
  'cadence.refreshFps / (constrained ? 30 : 75)',
  'ambient canvas should not use uneven legacy 30/75 fps frame skipping'
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
  'STAR_BASE_PULSE = 0.22',
  'ambient stars should retain visible contrast between their dim and bright phases'
);
expectIncludes(
  ambientCanvasModule,
  'MAX_SCENE_DELTA_SECONDS = 0.05',
  'ambient motion should cap elapsed time after dropped or hidden frames'
);
expectIncludes(
  ambientCanvasModule,
  'hasRays: index % 4 === 0',
  'a sparse subset of ambient stars should render subtle cross rays'
);
expectIncludes(
  ambientCanvasModule,
  'driftDuration:',
  'ambient stars should drift instead of flashing at fixed positions'
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
expectIncludes(
  effectsModule,
  "classList.toggle('is-motion-reduced', prefersReducedMotion)",
  'reduced motion should follow the explicit user preference'
);
expectIncludes(
  effectsModule,
  "classList.toggle('is-ambient-lite', constrainedDevice && !prefersReducedMotion)",
  'constrained devices should keep smooth ambient motion without disabling it'
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
  '--planet-hit-size: 72px;',
  'planet controls should expose a forgiving 72px hit target'
);
expectNotIncludes(
  styleSheet,
  '.orbit-layer:has(.planet:hover) .planet',
  'hovering one planet should not pause the complete orbit system'
);
expectIncludes(
  styleSheet,
  '.planet:hover,',
  'only the directly targeted planet should pause for interaction'
);
expectIncludes(
  styleSheet,
  'animation: planet-twinkle 3.2s ease-in-out infinite;',
  'ready planets should visibly twinkle without affecting their orbit'
);
expectNotIncludes(
  styleSheet,
  'steps(1, end) infinite',
  'ambient twinkles should not use visibly stepped animation'
);
expectIncludes(
  planetsModule,
  'const hitRadius = Math.max(46, rect.width * 0.65);',
  'planet clicks should resolve to a nearby interactive target'
);
expectNotIncludes(
  routingModule,
  'routeView.offsetHeight',
  'route rendering should not force synchronous layout'
);
expectIncludes(
  routingModule,
  'const scheduleRouteRender',
  'route rendering should be scheduled on the next animation frame'
);
expectIncludes(
  ambientCanvasModule,
  "hub.classList.contains('is-content-route') ? 2 : 1",
  'content routes should reduce only the background canvas workload'
);
expectIncludes(
  styleSheet,
  'animation: orbit-point calc(var(--speed) * .8) linear infinite;',
  'planet orbits should use faster independent angular velocities'
);
expectIncludes(
  styleSheet,
  'animation-delay: var(--phase, 0s);',
  'planet orbits should retain independent starting phases'
);
expectIncludes(
  styleSheet,
  '--r: var(--mobile-r) !important;',
  'mobile planets should keep their distinct orbit radii'
);
expectNotIncludes(
  styleSheet,
  'min(var(--mobile-r), 220px)',
  'mobile planet orbits should not collapse onto a shared outer radius'
);
expectNotIncludes(
  styleSheet,
  'translateX(calc(var(--r)',
  'future planets should not use eccentric paths that cross neighboring orbits'
);

const themeSheet = readFileSync('src/styles/themes.css', 'utf8');
expectIncludes(
  themeSheet,
  '.hub-v2[data-theme="light"] .planet::before',
  'light-theme planet glow should be limited to the visible planet core'
);
expectNotIncludes(
  themeSheet,
  '.hub-v2[data-theme="light"] .planet,\nhtml[data-theme-init="light"] .hub-v2 .planet {',
  'light-theme glow should not cover the full planet hit target'
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
