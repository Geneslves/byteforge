import { escapeHtml, getRoutePath, normalizeSearch } from './dom.js';

const matchesQuery = (entry, query) => {
  if (!query) return true;

  const haystack = entry.searchableText || [
    entry.meta,
    entry.title,
    entry.text,
    entry.collection,
    entry.category,
    entry.series,
    ...(entry.tags || []),
  ].join(' ').toLowerCase();

  return haystack.includes(query);
};

const matchesFilters = (entry, filters) => {
  if (filters.collection && filters.collection !== 'all' && entry.collection !== filters.collection) return false;
  if (filters.category && entry.category !== filters.category) return false;
  if (filters.series && entry.series !== filters.series) return false;
  if (filters.tag && !entry.tags?.includes(filters.tag)) return false;
  return true;
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
  if (!entries.length) return `<p class="route-empty">${escapeHtml(emptyText)}</p>`;

  return `
    <div class="route-list" data-route-list>
      ${entries.map(renderEntry).join('')}
    </div>
  `;
};

const renderRouteMeta = (config) => {
  const stats = config.stats || { entries: config.entries.length, tags: 0 };
  const topTags = config.topTags || [];

  return `
    <div class="route-meta" data-route-meta>
      <span>${escapeHtml(config.collection)} collection</span>
      <span>${escapeHtml(stats.entries)} entries</span>
      <span>${escapeHtml(stats.tags)} tags</span>
      ${topTags.length ? `
        <span class="route-meta-tags">${topTags.map((tag) => `#${escapeHtml(tag)}`).join(' ')}</span>
      ` : ''}
    </div>
  `;
};

const renderFilterButton = (filter, option, isActive = false) => `
  <button
    class="route-filter-chip${isActive ? ' is-active' : ''}"
    type="button"
    data-filter-button="${escapeHtml(filter)}"
    data-filter-value="${escapeHtml(option.id)}"
    aria-pressed="${isActive ? 'true' : 'false'}"
  >${escapeHtml(option.label)}</button>
`;

const renderFilterSelect = (filter, label, options) => `
  <label class="route-filter-select">
    <span>${escapeHtml(label)}</span>
    <select data-filter-select="${escapeHtml(filter)}">
      <option value="">all ${escapeHtml(label)}</option>
      ${options.map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`).join('')}
    </select>
  </label>
`;

const renderSearchControls = (searchConfig) => {
  const filters = searchConfig.filters;
  if (!filters) {
    return `<input class="route-search" data-route-search type="search" placeholder="${escapeHtml(searchConfig.placeholder)}" aria-label="Search ByteForge" />`;
  }

  return `
    <div class="route-search-controls" data-search-filters>
      <input class="route-search" data-route-search type="search" placeholder="${escapeHtml(searchConfig.placeholder)}" aria-label="Search ByteForge" />
      <div class="route-filter-group" aria-label="collection filter">
        <span>collection</span>
        <div class="route-filter-tabs">
          ${filters.collections.map((option) => renderFilterButton('collection', option, option.id === 'all')).join('')}
        </div>
      </div>
      <div class="route-filter-row">
        ${renderFilterSelect('category', 'category', filters.categories)}
        ${renderFilterSelect('series', 'series', filters.series)}
      </div>
      <div class="route-filter-group route-tag-filter" aria-label="tag filter">
        <span>tag</span>
        <div class="route-filter-tabs">
          ${filters.tags.map((option) => renderFilterButton('tag', option)).join('')}
        </div>
      </div>
    </div>
  `;
};

const renderArchiveGroup = (title, groups) => `
  <section class="archive-group">
    <h2>${escapeHtml(title)}</h2>
    <div class="archive-chip-grid">
      ${groups.map((group) => `
        <a href="/search/?${escapeHtml(new URLSearchParams({ q: group.label }).toString())}" class="archive-chip">
          <span>${escapeHtml(group.label)}</span>
          <code>${escapeHtml(group.count)}</code>
        </a>
      `).join('')}
    </div>
  </section>
`;

const renderArchiveIndex = (archive) => {
  if (!archive) return '';

  return `
    <div class="archive-index" data-archive-index>
      ${renderArchiveGroup('timeline', archive.timeline)}
      ${renderArchiveGroup('category', archive.categories)}
      ${renderArchiveGroup('series', archive.series)}
      ${renderArchiveGroup('tag', archive.tags.slice(0, 18))}
    </div>
  `;
};

const scrollToRouteHash = (routeView) => {
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

const setActiveNav = (hub, pathname) => {
  const cursor = hub.querySelector('.nav-cursor');

  hub.querySelectorAll('.cli-nav a').forEach((link) => {
    const linkPathname = getRoutePath(new URL(link.href, location.origin));
    const isActive = linkPathname === pathname;
    link.classList.toggle('active', isActive);
    if (isActive && cursor && !link.contains(cursor)) link.appendChild(cursor);
  });
};

export const initRouting = (hub, routeData, { skipKey }) => {
  const routeView = hub.querySelector('[data-route-view]');
  const navEntry = performance.getEntriesByType('navigation')[0];
  const isRouteReturn = navEntry?.type === 'back_forward' || sessionStorage.getItem(skipKey) === '1';

  if (isRouteReturn) {
    hub.classList.add('is-route-return');
    sessionStorage.removeItem(skipKey);
  }

  const renderRoute = () => {
    const pathname = getRoutePath(location);
    const config = routeData[pathname];
    setActiveNav(hub, config ? pathname : '/logs');

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

    routeView.innerHTML = `
      <div class="route-kicker">
        <span>${escapeHtml(config.kicker)}</span>
        <a href="/" class="route-back">return home</a>
      </div>
      <h1 class="route-title">${escapeHtml(config.title)}</h1>
      ${renderRouteMeta(config)}
      <p class="route-summary">${escapeHtml(config.summary)}</p>
      <p class="route-description">${escapeHtml(config.description)}</p>
      ${config.search ? renderSearchControls(config.search) : ''}
      ${config.archive ? renderArchiveIndex(config.archive) : ''}
      ${renderEntries(config.entries, config.search?.emptyText)}
    `;

    routeView.hidden = false;
    routeView.offsetHeight;
    hub.classList.add('is-content-route', 'is-route-return');

    const handleOutsideClick = (event) => {
      const targetElement = event.target instanceof Element ? event.target : event.target.parentElement;
      if (!targetElement || routeView.contains(event.target)) return;

      if (
        !targetElement.closest('.cli-nav') &&
        !targetElement.closest('.theme-toggle') &&
        !targetElement.closest('.audio-toggle') &&
        targetElement.closest('[data-boot-scope="byteforge-home"]')
      ) {
        if (hub.dataset.returning) return;
        hub.dataset.returning = 'true';

        event.preventDefault();
        event.stopPropagation();

        routeView.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        routeView.style.opacity = '0';
        routeView.style.transform = 'translateY(-50%) scale(0.96)';

        setTimeout(() => {
          hub.classList.remove('is-content-route');
          hub.classList.add('is-route-return');
          routeView.hidden = true;
          routeView.innerHTML = '';
          routeView.style.transition = '';
          routeView.style.opacity = '';
          routeView.style.transform = '';

          history.pushState(null, '', '/');
          hub.removeEventListener('click', hub._outsideClickHandler);
          delete hub._outsideClickHandler;
          delete hub.dataset.returning;

          sessionStorage.setItem(skipKey, '1');
        }, 350);
      }
    };

    hub.removeEventListener('click', hub._outsideClickHandler);
    hub._outsideClickHandler = handleOutsideClick;
    hub.addEventListener('click', handleOutsideClick);

    const searchControls = routeView.querySelector('[data-search-filters]');
    const searchInput = routeView.querySelector('[data-route-search]');
    if (searchInput) {
      const selectControl = (filter) => routeView.querySelector(`[data-filter-select="${filter}"]`);
      const setActiveButton = (filter, value) => {
        routeView.querySelectorAll(`[data-filter-button="${filter}"]`).forEach((button) => {
          const isActive = button.dataset.filterValue === value;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', String(isActive));
        });
      };
      const readFilters = () => {
        const activeCollection = routeView.querySelector('[data-filter-button="collection"].is-active')?.dataset.filterValue || 'all';
        const activeTag = routeView.querySelector('[data-filter-button="tag"].is-active')?.dataset.filterValue || '';
        return {
          query: normalizeSearch(searchInput.value),
          collection: activeCollection,
          category: selectControl('category')?.value || '',
          series: selectControl('series')?.value || '',
          tag: activeTag,
        };
      };
      const syncFilterUrl = (filters) => {
        const nextUrl = new URL(location.href);
        const rawQuery = searchInput.value.trim();
        const values = {
          q: rawQuery,
          collection: filters.collection === 'all' ? '' : filters.collection,
          category: filters.category,
          series: filters.series,
          tag: filters.tag,
        };

        for (const [key, value] of Object.entries(values)) {
          if (value) {
            nextUrl.searchParams.set(key, value);
          } else {
            nextUrl.searchParams.delete(key);
          }
        }
        history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      };
      const applySearch = (syncUrl = false) => {
        const filters = readFilters();
        const filteredEntries = config.entries.filter((entry) =>
          matchesQuery(entry, filters.query) && matchesFilters(entry, filters)
        );
        const listTarget = routeView.querySelector('[data-route-list], .route-empty');
        if (!listTarget) return;
        listTarget.outerHTML = renderEntries(filteredEntries, config.search.emptyText);

        if (syncUrl) syncFilterUrl(filters);
      };

      const params = new URLSearchParams(location.search);
      searchInput.value = params.get('q') || '';
      if (searchControls) {
        const collectionValue = params.get('collection') || 'all';
        setActiveButton('collection', collectionValue);
        const categorySelect = selectControl('category');
        const seriesSelect = selectControl('series');
        if (categorySelect) categorySelect.value = params.get('category') || '';
        if (seriesSelect) seriesSelect.value = params.get('series') || '';
        setActiveButton('tag', params.get('tag') || '');

        searchControls.addEventListener('click', (event) => {
          const targetElement = event.target instanceof Element ? event.target : event.target.parentElement;
          const button = targetElement?.closest('[data-filter-button]');
          if (!button) return;

          const filter = button.dataset.filterButton;
          const value = button.dataset.filterValue || '';
          const nextValue = filter === 'tag' && button.classList.contains('is-active') ? '' : value;
          setActiveButton(filter, nextValue);
          applySearch(true);
        });
        searchControls.addEventListener('change', () => applySearch(true));
      }
      applySearch();
      searchInput.addEventListener('input', () => applySearch(true));
    }

    scrollToRouteHash(routeView);
  };

  const navigateToRoute = (url) => {
    const targetPath = getRoutePath(url);
    if (targetPath !== '/' && !routeData[targetPath]) return false;

    sessionStorage.setItem(skipKey, '1');
    history.pushState(null, '', `${targetPath}${url.search}${url.hash}`);
    renderRoute();
    return true;
  };

  renderRoute();

  hub.querySelectorAll('.cli-nav a').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const url = new URL(link.href, location.origin);
      if (url.origin !== location.origin) return;

      if (navigateToRoute(url)) event.preventDefault();
    });
  });

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

    if (navigateToRoute(url)) event.preventDefault();
  });

  return { renderRoute };
};
