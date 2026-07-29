const normalizePlanetConfig = (planetRoutes, label) => {
  const config = planetRoutes[label];
  if (typeof config === 'string') return { route: config, state: 'ready' };
  if (config && typeof config === 'object') return config;
  return { route: null, state: 'future' };
};

export const initPlanets = (hub, planetRoutes, renderRoute, { skipKey }) => {
  const planets = [...hub.querySelectorAll('.planet')];

  const activatePlanet = (planet, event) => {
    if (!planet || planet.dataset.kind === 'future' || planet.dataset.state === 'disabled') return;
    if (!planet.dataset.route) return;

    event.preventDefault();
    event.stopPropagation();
    history.pushState(null, '', planet.dataset.route);
    renderRoute();
    sessionStorage.setItem(skipKey, '1');
  };

  planets.forEach((planet) => {
    const label = planet.getAttribute('aria-label');
    const config = normalizePlanetConfig(planetRoutes, label);
    const route = config.route || null;
    const state = config.state || (route ? 'ready' : 'future');
    const isInteractive = Boolean(route) && !['future', 'disabled'].includes(state);

    planet.dataset.state = state;
    if (config.collection) planet.dataset.collection = config.collection;

    if (isInteractive) {
      planet.dataset.route = route;
      planet.removeAttribute('data-kind');
    } else {
      delete planet.dataset.route;
      planet.dataset.kind = 'future';
    }

    planet.addEventListener('pointerleave', () => {
      planet.classList.remove('is-locked');
    });
  });

  hub.addEventListener('click', (event) => {
    const targetElement = event.target instanceof Element ? event.target : event.target.parentElement;
    const targetPlanet = targetElement?.closest('.planet');
    if (hub.classList.contains('is-content-route')) return;

    let planet = targetPlanet;
    if (event.detail > 0 && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      let closestDistance = Infinity;
      for (const candidate of planets) {
        const rect = candidate.getBoundingClientRect();
        const distance = Math.hypot(
          event.clientX - (rect.left + rect.width / 2),
          event.clientY - (rect.top + rect.height / 2),
        );
        const hitRadius = Math.max(46, rect.width * 0.65);
        if (distance <= hitRadius && distance < closestDistance) {
          planet = candidate;
          closestDistance = distance;
        }
      }
    }

    activatePlanet(planet, event);
  });
};
