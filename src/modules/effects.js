const createMeteor = () => {
  const meteor = document.createElement('div');
  meteor.className = 'meteor';

  const width = window.innerWidth || document.documentElement.clientWidth || 1200;
  const height = window.innerHeight || document.documentElement.clientHeight || 800;
  const tailPadding = 220;
  const edge = Math.random();
  let startX;
  let startY;

  if (edge < 0.72) {
    startX = Math.random() * (width * 0.88) - tailPadding * 0.35;
    startY = -tailPadding;
  } else {
    startX = -tailPadding;
    startY = Math.random() * (height * 0.46) - tailPadding * 0.25;
  }

  const travel = Math.max(width - startX, height - startY) + tailPadding;
  const duration = Math.max(1.15, Math.min(2.35, travel / 760 + Math.random() * 0.35));
  const scale = Math.random() * 0.5 + 0.7;

  meteor.style.left = `${startX}px`;
  meteor.style.top = `${startY}px`;
  meteor.style.setProperty('--meteor-travel-x', `${travel}px`);
  meteor.style.setProperty('--meteor-travel-y', `${travel}px`);
  meteor.style.setProperty('--meteor-scale', scale.toFixed(2));
  meteor.style.animationDuration = `${duration}s`;
  meteor.dataset.duration = String(duration);

  return meteor;
};

const initMeteorShower = (hub) => {
  let container = document.querySelector('.meteor-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'meteor-container';
    hub.appendChild(container);
  }

  const isMobile = window.matchMedia('(max-width: 760px)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const spawnMeteor = () => {
    const meteor = createMeteor();
    container.appendChild(meteor);
    const duration = Number(meteor.dataset.duration) || 1.6;
    setTimeout(() => meteor.remove(), (duration + 0.3) * 1000);
  };

  const meteorBurst = () => {
    const burstCount = isMobile
      ? Math.floor(Math.random() * 2) + 1
      : Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < burstCount; i += 1) {
      setTimeout(spawnMeteor, Math.random() * 1200);
    }
  };

  const continuousMeteors = () => {
    spawnMeteor();
    const delay = isMobile
      ? Math.random() * 3500 + 3000
      : Math.random() * 2500 + 2000;
    setTimeout(continuousMeteors, delay);
  };

  const scheduleBurst = () => {
    const delay = isMobile
      ? Math.random() * 15000 + 12000
      : Math.random() * 10000 + 8000;
    setTimeout(() => {
      meteorBurst();
      scheduleBurst();
    }, delay);
  };

  continuousMeteors();
  setTimeout(meteorBurst, 2000);
  scheduleBurst();
};

const initParallax = (hub) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const current = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let rafId = 0;

  const clamp = (value) => Math.max(-1, Math.min(1, value));
  const setLayerOffset = (name, x, y) => {
    hub.style.setProperty(`--parallax-${name}-x`, `${x.toFixed(2)}px`);
    hub.style.setProperty(`--parallax-${name}-y`, `${y.toFixed(2)}px`);
  };

  const updateParallax = () => {
    current.x += (target.x - current.x) * 0.085;
    current.y += (target.y - current.y) * 0.085;

    setLayerOffset('back', current.x * -18, current.y * -12);
    setLayerOffset('star', current.x * 16, current.y * 11);
    setLayerOffset('stage', current.x * 26, current.y * 18);
    setLayerOffset('orbit', current.x * 34, current.y * 24);
    setLayerOffset('light', current.x * 12, current.y * 9);
    setLayerOffset('core', current.x * 8, current.y * 6);

    if (Math.abs(target.x - current.x) > 0.002 || Math.abs(target.y - current.y) > 0.002) {
      rafId = requestAnimationFrame(updateParallax);
    } else {
      rafId = 0;
    }
  };

  const requestParallaxFrame = () => {
    if (!rafId) rafId = requestAnimationFrame(updateParallax);
  };

  hub.addEventListener('pointermove', (event) => {
    const rect = hub.getBoundingClientRect();
    target.x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2);
    target.y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2);
    requestParallaxFrame();
  });

  hub.addEventListener('pointerleave', () => {
    target.x = 0;
    target.y = 0;
    requestParallaxFrame();
  });
};

const scheduleIdle = (callback, { timeout = 1800 } = {}) => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
    return;
  }

  window.setTimeout(callback, timeout);
};

const markBootComplete = (hub) => {
  const boot = hub.querySelector('.boot-sequence');
  if (!boot) return;

  const complete = () => {
    hub.classList.add('is-boot-complete');
    hub.classList.remove('is-performance-lite');
  };
  boot.addEventListener('animationend', (event) => {
    if (event.animationName === 'boot-away') complete();
  }, { once: true });
  window.setTimeout(complete, 1300);
};

export const initEffects = (hub) => {
  hub.classList.add('is-performance-lite');
  markBootComplete(hub);
  scheduleIdle(() => initMeteorShower(hub), { timeout: 2200 });
  initParallax(hub);

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) hub.classList.add('is-route-return');
  });
};

export const initKeyboardNav = (hub) => {
  const planets = Array.from(hub.querySelectorAll('.planet:not([data-kind="future"])'));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && hub.classList.contains('is-content-route')) {
      event.preventDefault();
      hub.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    if (event.key === 'Enter' && document.activeElement.classList.contains('planet')) {
      event.preventDefault();
      document.activeElement.click();
    }
  });

  planets.forEach((planet, index) => {
    planet.setAttribute('tabindex', '0');
    planet.setAttribute('role', 'button');
    if (!planet.hasAttribute('aria-label')) {
      planet.setAttribute('aria-label', planet.textContent.trim() || `Planet ${index + 1}`);
    }
  });
};
