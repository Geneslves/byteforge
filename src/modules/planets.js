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

    const getOrbitAnimation = () =>
      planet.getAnimations().find((animation) => animation.animationName === 'orbit-point' || animation.animationName === 'orbit-drift') ||
      planet.getAnimations()[0];

    const setOrbitRate = (rate) => {
      const animation = getOrbitAnimation();
      if (!animation) return;
      animation.updatePlaybackRate?.(rate);
      animation.playbackRate = rate;
    };

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

    planet.addEventListener('pointerenter', () => setOrbitRate(0.08));
    planet.addEventListener('pointerleave', () => {
      setOrbitRate(1);
      planet.classList.remove('is-locked');
    });
  });
};
