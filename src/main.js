import { routeData, planetRoutes } from './content.js';

(() => {
    const hub = document.querySelector('[data-boot-scope="byteforge-home"]');
    if (!hub) return;

    // 主题管理
    const THEME_KEY = 'byteforge:theme';
    const themes = {
      dark: {
        name: '深色模式',
        icon: '🌙'
      },
      light: {
        name: '亮色模式',
        icon: '☀️'
      }
    };

    const initTheme = () => {
      const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
      // 从 html 读取预设主题，避免闪烁
      const presetTheme = document.documentElement.getAttribute('data-theme-init');
      if (presetTheme) {
        document.documentElement.removeAttribute('data-theme-init');
      }
      hub.dataset.theme = savedTheme;
      return savedTheme;
    };

    const toggleTheme = (event) => {
      const current = hub.dataset.theme || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      hub.dataset.theme = next;
      localStorage.setItem(THEME_KEY, next);

      // 创建波纹扩散效果
      if (event) {
        const ripple = document.createElement('div');
        ripple.className = 'theme-ripple';
        ripple.style.left = event.clientX + 'px';
        ripple.style.top = event.clientY + 'px';
        ripple.style.width = '20px';
        ripple.style.height = '20px';
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 800);
      }

      // 触发主题切换动画
      hub.classList.add('theme-switching');
      setTimeout(() => hub.classList.remove('theme-switching'), 400);

      return next;
    };

    const currentTheme = initTheme();

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

    const getRoutePath = (urlLike = location) => urlLike.pathname.replace(/\/$/, '') || '/';

    const scrollToRouteHash = () => {
      let id = location.hash.slice(1);
      if (!id || !routeView) return;

      try {
        id = decodeURIComponent(id);
      } catch {
        // Keep the raw hash if it is not valid percent-encoded text.
      }

      requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (target && routeView.contains(target)) target.scrollIntoView({ block: 'nearest' });
      });
    };

    const setActiveNav = (pathname) => {
      const cursor = hub.querySelector('.nav-cursor');
      hub.querySelectorAll('.cli-nav a').forEach((link) => {
        const linkPathname = getRoutePath(new URL(link.href, location.origin));
        const isActive = linkPathname === pathname;
        link.classList.toggle('active', isActive);
        if (isActive && cursor && !link.contains(cursor)) link.appendChild(cursor);
      });
    };

    const renderRoute = () => {
      const pathname = getRoutePath(location);
      const config = routeData[pathname];
      setActiveNav(config ? pathname : '/logs');

      if (!routeView || !config) {
        hub.classList.remove('is-content-route');
        delete hub.dataset.routeTheme;
        hub.removeEventListener('click', hub._outsideClickHandler);
        delete hub._outsideClickHandler;
        if (routeView) {
          routeView.hidden = true;
          routeView.innerHTML = '';
        }
        return;
      }

      if (config.theme) {
        hub.dataset.routeTheme = config.theme;
      } else {
        delete hub.dataset.routeTheme;
      }

      // 先填充内容
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

      // 显示卡片（添加入场动画）
      routeView.hidden = false;

      // 强制重排以触发动画
      routeView.offsetHeight;

      // 添加背景样式
      hub.classList.add('is-content-route', 'is-route-return');

      // 点击卡片外部返回首页（带动画）
      const handleOutsideClick = (event) => {
        const targetElement = event.target instanceof Element ? event.target : event.target.parentElement;
        if (routeView.contains(event.target)) return;
        if (!targetElement) return;

        if (!routeView.contains(event.target) &&
            !targetElement.closest('.cli-nav') &&
            !targetElement.closest('.theme-toggle') &&
            targetElement.closest('[data-boot-scope="byteforge-home"]')) {

          // 防止重复触发
          if (hub.dataset.returning) return;
          hub.dataset.returning = 'true';

          event.preventDefault();
          event.stopPropagation();

          // 添加退出动画
          routeView.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
          routeView.style.opacity = '0';
          routeView.style.transform = 'translateY(-50%) scale(0.96)';

          setTimeout(() => {
            // 清除 is-content-route 类，恢复首页状态
            hub.classList.remove('is-content-route');
            hub.classList.add('is-route-return');
            routeView.hidden = true;
            routeView.innerHTML = '';

            // 重置样式
            routeView.style.transition = '';
            routeView.style.opacity = '';
            routeView.style.transform = '';

            // 更新 URL
            history.pushState(null, '', '/');

            // 移除事件监听器
            hub.removeEventListener('click', hub._outsideClickHandler);
            delete hub._outsideClickHandler;
            delete hub.dataset.returning;

            sessionStorage.setItem(skipKey, '1');
          }, 350);
        }
      };

      // 移除旧的监听器（如果有）
      hub.removeEventListener('click', hub._outsideClickHandler);
      hub._outsideClickHandler = handleOutsideClick;
      hub.addEventListener('click', handleOutsideClick);

      const searchInput = routeView.querySelector('[data-route-search]');
      if (searchInput) {
        const applySearch = (syncUrl = false) => {
          const query = normalizeSearch(searchInput.value);
          const filteredEntries = config.entries.filter((entry) => matchesQuery(entry, query));
          const listTarget = routeView.querySelector('[data-route-list], .route-empty');
          if (!listTarget) return;
          listTarget.outerHTML = renderEntries(filteredEntries, config.search.emptyText);

          if (syncUrl) {
            const nextUrl = new URL(location.href);
            const rawQuery = searchInput.value.trim();
            if (rawQuery) {
              nextUrl.searchParams.set('q', rawQuery);
            } else {
              nextUrl.searchParams.delete('q');
            }
            history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
          }
        };

        searchInput.value = new URLSearchParams(location.search).get('q') || '';
        applySearch();
        searchInput.addEventListener('input', () => applySearch(true));
      }

      scrollToRouteHash();
    };

    renderRoute();

    // 监听浏览器前进/后退按钮
    window.addEventListener('popstate', () => {
      renderRoute();
      sessionStorage.setItem(skipKey, '1');
    });

    routeView?.addEventListener('click', (event) => {
      const targetElement = event.target instanceof Element ? event.target : event.target.parentElement;
      const link = targetElement?.closest('a[href]');
      if (!link || !routeView.contains(link)) return;

      const url = new URL(link.href, location.origin);
      if (url.origin !== location.origin) return;

      const targetPath = getRoutePath(url);
      if (targetPath !== '/' && !routeData[targetPath]) return;

      event.preventDefault();
      sessionStorage.setItem(skipKey, '1');
      history.pushState(null, '', `${targetPath}${url.search}${url.hash}`);
      renderRoute();
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

    const normalizePlanetConfig = (label) => {
      const config = planetRoutes[label];
      if (typeof config === 'string') return { route: config, state: 'ready' };
      if (config && typeof config === 'object') return config;
      return { route: null, state: 'future' };
    };

    hub.querySelectorAll('.planet').forEach((planet) => {
      const label = planet.getAttribute('aria-label');
      const config = normalizePlanetConfig(label);
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
      const slowOrbit = () => setOrbitRate(0.08);  // 极慢移动，便于点击
      const restoreOrbit = () => setOrbitRate(1);

      planet.addEventListener('click', (event) => {
        if (planet.dataset.kind === 'future' || planet.dataset.state === 'disabled') return;

        // 如果有路由，使用 SPA 导航
        if (planet.dataset.route) {
          event.preventDefault();
          event.stopPropagation();

          const targetPath = planet.dataset.route;

          // 更新 URL
          history.pushState(null, '', targetPath);

          // 渲染路由内容
          renderRoute();

          // 标记跳过首页动画
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

    // 流星雨动画
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
      const scale = Math.random() * 0.5 + 0.7; // 0.7-1.2x

      meteor.style.left = `${startX}px`;
      meteor.style.top = `${startY}px`;
      meteor.style.setProperty('--meteor-travel-x', `${travel}px`);
      meteor.style.setProperty('--meteor-travel-y', `${travel}px`);
      meteor.style.setProperty('--meteor-scale', scale.toFixed(2));
      meteor.style.animationDuration = duration + 's';
      meteor.dataset.duration = String(duration);

      return meteor;
    };

    const initMeteorShower = () => {
      let container = document.querySelector('.meteor-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'meteor-container';
        hub.appendChild(container);
      }

      // 检测移动设备
      const isMobile = window.matchMedia('(max-width: 760px)').matches;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // 如果用户偏好减少动画，完全禁用流星雨
      if (reducedMotion) {
        return;
      }

      const spawnMeteor = () => {
        const meteor = createMeteor();
        container.appendChild(meteor);
        const duration = Number(meteor.dataset.duration) || 1.6;
        setTimeout(() => meteor.remove(), (duration + 0.3) * 1000);
      };

      // 流星雨爆发模式
      const meteorBurst = () => {
        const burstCount = isMobile
          ? Math.floor(Math.random() * 2) + 1  // 移动端 1-2 颗
          : Math.floor(Math.random() * 3) + 2; // 桌面端 2-4 颗
        for (let i = 0; i < burstCount; i++) {
          setTimeout(spawnMeteor, Math.random() * 1200);
        }
      };

      // 持续小流星
      const continuousMeteors = () => {
        spawnMeteor();
        const delay = isMobile
          ? Math.random() * 3500 + 3000  // 移动端 3-6.5 秒
          : Math.random() * 2500 + 2000; // 桌面端 2-4.5 秒
        setTimeout(continuousMeteors, delay);
      };

      // 定期流星雨爆发
      const scheduleBurst = () => {
        const delay = isMobile
          ? Math.random() * 15000 + 12000  // 移动端 12-27 秒
          : Math.random() * 10000 + 8000;  // 桌面端 8-18 秒
        setTimeout(() => {
          meteorBurst();
          scheduleBurst();
        }, delay);
      };

      // 启动
      continuousMeteors();
      setTimeout(meteorBurst, 2000); // 2秒后第一次爆发
      scheduleBurst();
    };

    // 页面加载进度条
    const createLoadingBar = () => {
      const bar = document.createElement('div');
      bar.className = 'loading-bar';
      document.body.appendChild(bar);
      return bar;
    };

    const showLoadingBar = () => {
      const bar = createLoadingBar();
      let progress = 0;

      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress > 90) progress = 90;
        bar.style.width = progress + '%';
      }, 200);

      return {
        complete: () => {
          clearInterval(interval);
          bar.style.width = '100%';
          bar.classList.add('complete');
          setTimeout(() => bar.remove(), 300);
        }
      };
    };

    // 键盘导航支持
    const initKeyboardNav = () => {
      const planets = Array.from(hub.querySelectorAll('.planet:not([data-kind="future"])'));

      // ESC 返回首页
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && hub.classList.contains('is-content-route')) {
          e.preventDefault();
          const clickEvent = new MouseEvent('click', { bubbles: true });
          hub.dispatchEvent(clickEvent);
        }

        // Enter 激活星球
        if (e.key === 'Enter' && document.activeElement.classList.contains('planet')) {
          e.preventDefault();
          document.activeElement.click();
        }
      });

      // 让星球可以获得焦点
      planets.forEach((planet, index) => {
        planet.setAttribute('tabindex', '0');
        planet.setAttribute('role', 'button');
        if (!planet.hasAttribute('aria-label')) {
          planet.setAttribute('aria-label', planet.textContent.trim() || `Planet ${index + 1}`);
        }
      });
    };

    // 初始化所有效果
    initMeteorShower();
    initKeyboardNav();

    // 监听页面导航，显示加载进度（仅用于真正的页面加载，不用于 SPA 导航）
    window.addEventListener('pageshow', (event) => {
      // SPA 导航不需要加载进度条
    });

    // 主题切换按钮
    const themeToggle = hub.querySelector('.theme-toggle');
    if (themeToggle) {
      const updateThemeIcon = (theme) => {
        const icon = themeToggle.querySelector('.theme-icon');
        if (icon) icon.textContent = themes[theme].icon;
      };

      updateThemeIcon(currentTheme);

      themeToggle.addEventListener('click', (event) => {
        const newTheme = toggleTheme(event);
        updateThemeIcon(newTheme);
      });
    }
  })();
