(() => {
    const hub = document.querySelector('[data-boot-scope="byteforge-home"]');
    if (!hub) return;

    const skipKey = 'byteforge:skip-home-boot';
    const navEntry = performance.getEntriesByType('navigation')[0];
    const isHistoryReturn = navEntry?.type === 'back_forward';
    const isRouteReturn = sessionStorage.getItem(skipKey) === '1';

    if (isHistoryReturn || isRouteReturn) {
      hub.classList.add('is-route-return');
      sessionStorage.removeItem(skipKey);
    }

    hub.querySelectorAll('.cli-nav a').forEach((link) => {
      link.addEventListener('click', () => sessionStorage.setItem(skipKey, '1'));
    });

    const routeView = hub.querySelector('[data-route-view]');
    const routeData = {
      '/logs': {
        kicker: '>_ ~/logs',
        title: 'Field Logs',
        summary: '工程、研究、部署和知识归档的连续记录。这里将承载后续文章列表和系列索引。',
        entries: [
          ['2026-06-02', 'ByteForge visual baseline', '冻结首页动效、终端导航、粒子光场和中性色温规范。'],
          ['2026-06-02', 'Interface clarity pass', '去黄、去灰雾、收紧光晕，让首屏保持明亮但不模糊。'],
          ['2026-06-02', 'Route shell initialized', '为日志、部署和搜索建立第一版内容入口骨架。'],
        ],
      },
      '/deployments': {
        kicker: '>_ ~/deployments',
        title: 'Deployments',
        summary: '项目、实验和服务的发布索引。后续用于沉淀可访问作品、部署说明和运行状态。',
        entries: [
          ['WEB', 'ByteForge Home', '个人技术博客与作品集首页视觉系统。'],
          ['DOCS', 'Design Baseline', '设计规则、禁用回退项和验收标准。'],
          ['LAB', 'Future Modules', '搜索、归档、项目详情和知识库入口。'],
        ],
      },
      '/search': {
        kicker: '>_ /.search',
        title: 'Search Core',
        summary: '搜索模块骨架已接入。后续将连接静态索引，用于检索文章、项目和知识归档。',
        search: true,
        entries: [
          ['INDEX', 'Logs', '文章、系列和工程记录。'],
          ['INDEX', 'Projects', '部署项目、实验原型和工具链。'],
          ['INDEX', 'Archive', '学术、参考文献和知识管理笔记。'],
        ],
      },
    };

    const escapeHtml = (value) =>
      String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]);

    const setActiveNav = (pathname) => {
      const cursor = hub.querySelector('.nav-cursor');
      hub.querySelectorAll('.cli-nav a').forEach((link) => {
        const isActive = new URL(link.href, location.origin).pathname === pathname;
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
        <p class="route-kicker">${escapeHtml(config.kicker)}</p>
        <h1 class="route-title">${escapeHtml(config.title)}</h1>
        <p class="route-summary">${escapeHtml(config.summary)}</p>
        ${config.search ? '<input class="route-search" type="search" placeholder="grep -r logs projects archive" aria-label="Search ByteForge" />' : ''}
        <div class="route-list">
          ${config.entries.map(([meta, title, text]) => `
            <article class="route-entry">
              <code>${escapeHtml(meta)}</code>
              <div>
                <strong>${escapeHtml(title)}</strong>
                <span>${escapeHtml(text)}</span>
              </div>
            </article>
          `).join('')}
        </div>
      `;
    };

    renderRoute();

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
      const getOrbitAnimation = () =>
        planet.getAnimations().find((animation) => animation.animationName === 'orbit-point') ||
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
        hub.querySelectorAll('.planet.is-locked').forEach((node) => {
          if (node !== planet) node.classList.remove('is-locked');
        });
        planet.classList.toggle('is-locked');
      });
      planet.addEventListener('pointerenter', slowOrbit);
      planet.addEventListener('pointerleave', restoreOrbit);
    });

    window.addEventListener('pageshow', (event) => {
      if (event.persisted) hub.classList.add('is-route-return');
    });
  })();
