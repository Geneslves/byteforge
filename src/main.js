import { routeData, planetRoutes } from './data/content.js';
import { initAudioControl } from './modules/audio.js';
import { initEffects, initKeyboardNav } from './modules/effects.js';
import { initPlanets } from './modules/planets.js';
import { initRouting } from './modules/routing.js';
import { initTheme } from './modules/theme.js';

const hub = document.querySelector('[data-boot-scope="byteforge-home"]');

if (hub) {
  const skipKey = 'byteforge:skip-home-boot';
  const routing = initRouting(hub, routeData, { skipKey });

  initTheme(hub);
  initAudioControl(hub);
  initEffects(hub);
  initPlanets(hub, planetRoutes, routing.renderRoute, { skipKey });
  initKeyboardNav(hub);
}
