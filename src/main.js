import { routeData, planetRoutes } from './content.js';

(() => {
    const hub = document.querySelector('[data-boot-scope="byteforge-home"]');
    if (!hub) return;

    const skipKey = 'byteforge:skip-home-boot';
    const navEntry = performance.getEntriesByType('navigation')[0];
    const isRouteReturn = navEntry?.type === 'back_forward' || sessionStorage.getItem(skipKey) === '1';

    if (isRouteReturn) {
      hub.classList.add('is-route-return');
      sessionStorage.removeItem(skipKey);
    }

    hub.querySelectorAll('.cli-nav a').forEach((link) => {
      link.addEventListener('click', () => sessionStorage.setItem(skipKey, '1'));
    });

    const routeView = hub.querySelector('[data-route-view]');

    const escapeHtml = (value) =>
      String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]);

    const normalizeSearch = (value) => String(value).trim().toLowerCase();

    const matchesQuery = (entry, query) => {
      if (!query) return true;

      const haystack = [
        entry.meta,
        entry.title,
        entry.text,
        entry.collection,
        ...(entry.tags || []),
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    };

    const renderEntry = (entry) => `
      <article class="route-entry" id="${escapeHtml(entry.id)}">
        <code>${escapeHtml(entry.meta)}</code>
        <div>
          <a class="route-entry-title" href="${escapeHtml(entry.href)}">${escapeHtml(entry.title)}</a>
          <span>${escapeHtml(entry.text)}</span>
          ${entry.tags?.length ? `
            <div class="route-tags" aria-label="Tags">
              ${entry.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </article>
    `;

    const renderEntries = (entries, emptyText = 'No entries.') => {
      if (!entries.length) {
        return `<p class="route-empty">${escapeHtml(emptyText)}</p>`;
      }

      return `
        <div class="route-list" data-route-list>
          ${entries.map(renderEntry).join('')}
        </div>
      `;
    };

    const setActiveNav = (pathname) => {
      const cursor = hub.querySelector('.nav-cursor');
      hub.querySelectorAll('.cli-nav a').forEach((link) => {
        const linkPathname = new URL(link.href, location.origin).pathname.replace(/\/$/, '') || '/';
        const isActive = linkPathname === pathname;
        link.classList.toggle('active', isActive);
        if (isActive && cursor && !link.contains(cursor)) link.appendChild(cursor);
      });
    };

    const renderRoute = () => {
      const pathname = location.pathname.replace(/\/$/, '') || '/';
      const config = routeData[pathname];
      setActiveNav(config ? pathname : '/logs');

      if (!routeView || !config) {
        hub.classList.remove('is-content-route');
        if (routeView) routeView.hidden = true;
        return;
      }

      hub.classList.add('is-content-route', 'is-route-return');
      routeView.hidden = false;
      routeView.innerHTML = `
        <div class="route-kicker">
          <span>${escapeHtml(config.kicker)}</span>
          <a href="/" class="route-back">← 返回首页</a>
        </div>
        <h1 class="route-title">${escapeHtml(config.title)}</h1>
        <p class="route-summary">${escapeHtml(config.summary)}</p>
        ${config.search ? `
          <input class="route-search" data-route-search type="search" placeholder="${escapeHtml(config.search.placeholder)}" aria-label="Search ByteForge" />
        ` : ''}
        ${renderEntries(config.entries, config.search?.emptyText)}
      `;

      const searchInput = routeView.querySelector('[data-route-search]');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const query = normalizeSearch(searchInput.value);
          const filteredEntries = config.entries.filter((entry) => matchesQuery(entry, query));
          const listTarget = routeView.querySelector('[data-route-list], .route-empty');
          if (!listTarget) return;
          listTarget.outerHTML = renderEntries(filteredEntries, config.search.emptyText);
        });
      }
    };

    renderRoute();

    routeView?.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="/"]');
      if (link) sessionStorage.setItem(skipKey, '1');
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const current = { x: 0, y: 0 };
      const target = { x: 0, y: 0 };
      let rafId = 0;

      const clamp = (value) => Math.max(-1, Math.min(1, value));
      const setLayerOffset = (name, x, y) => {
        hub.style.setProperty(`--parallax-${name}-x`, `${x.toFixed(2)}px`);
        hub.style.setProperty(`--parallax-${name}-y`, `${y.toFixed(2)}px`);
      };

      const updateParallax = () => {
        current.x += (target.x - current.x) * 0.075;
        current.y += (target.y - current.y) * 0.075;

        setLayerOffset('back', current.x * -16, current.y * -10);
        setLayerOffset('star', current.x * 14, current.y * 9);
        setLayerOffset('stage', current.x * 22, current.y * 15);
        setLayerOffset('orbit', current.x * 30, current.y * 20);
        setLayerOffset('light', current.x * 10, current.y * 8);
        setLayerOffset('core', current.x * 7, current.y * 5);

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
        target.x = clamp(((event.clientX - rect.left) / rect.width - .5) * 2);
        target.y = clamp(((event.clientY - rect.top) / rect.height - .5) * 2);
        requestParallaxFrame();
      });

      hub.addEventListener('pointerleave', () => {
        target.x = 0;
        target.y = 0;
        requestParallaxFrame();
      });
    }

    hub.querySelectorAll('.planet').forEach((planet) => {
      const label = planet.getAttribute('aria-label');
      const route = planetRoutes[label];

      // 根据是否有路由映射，自动设置星球状态
      if (route) {
        planet.removeAttribute('data-kind');
        planet.dataset.route = route;
      } else {
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
      const slowOrbit = () => setOrbitRate(0.18);
      const restoreOrbit = () => setOrbitRate(1);

      planet.addEventListener('pointerdown', (event) => {
        event.preventDefault();
      });
      planet.addEventListener('click', () => {
        if (planet.dataset.kind === 'future') return;

        // 如果有路由，跳转
        if (planet.dataset.route) {
          window.location.href = planet.dataset.route;
          sessionStorage.setItem(skipKey, '1');
          return;
        }

        // 否则执行原有的锁定逻辑
        hub.querySelectorAll('.planet.is-locked').forEach((node) => {
          if (node !== planet) node.classList.remove('is-locked');
        });
        planet.classList.toggle('is-locked');
      });
      planet.addEventListener('pointerenter', slowOrbit);
      planet.addEventListener('pointerleave', () => {
        restoreOrbit();
        planet.classList.remove('is-locked');
      });
    });

    window.addEventListener('pageshow', (event) => {
      if (event.persisted) hub.classList.add('is-route-return');
    });
  })();
