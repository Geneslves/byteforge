const normalizePlanetConfig = (planetRoutes, label) => {
  const config = planetRoutes[label];
  if (typeof config === 'string') return { route: config, state: 'ready' };
  if (config && typeof config === 'object') return config;
  return { route: null, state: 'future' };
};

export const initPlanets = (hub, planetRoutes, renderRoute, { skipKey }) => {
  hub.querySelectorAll('.planet').forEach((planet) => {
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

    planet.addEventListener('click', (event) => {
      if (planet.dataset.kind === 'future' || planet.dataset.state === 'disabled') return;

      if (planet.dataset.route) {
        event.preventDefault();
        event.stopPropagation();
        history.pushState(null, '', planet.dataset.route);
        renderRoute();
        sessionStorage.setItem(skipKey, '1');
        return;
      }

      hub.querySelectorAll('.planet.is-locked').forEach((node) => {
        if (node !== planet) node.classList.remove('is-locked');
      });
      planet.classList.toggle('is-locked');
    });

    planet.addEventListener('pointerleave', () => {
      planet.classList.remove('is-locked');
    });
  });
};
