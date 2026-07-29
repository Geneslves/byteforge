import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { inflateSync } from 'node:zlib';

const distDir = resolve('dist');
const errors = [];
const cdpCommandTimeoutMs = Number.parseInt(process.env.BYTEFORGE_VISUAL_CDP_TIMEOUT_MS || '5000', 10);
const routeTimeoutMs = Number.parseInt(process.env.BYTEFORGE_VISUAL_ROUTE_TIMEOUT_MS || '10000', 10);
const routes = [
  '/',
  '/logs/',
  '/deployments/',
  '/archive/',
  '/documents/performance-optimization-complete/',
  '/search/',
  '/search/?q=vite&collection=logs&category=Engineering&series=Build%20Journal&tag=vite',
  '/academic/',
];
const standaloneRoutes = [
  '/pages/nav.html',
  '/pages/profile.html',
  '/pages/account.html',
  '/pages/notifications.html',
  '/pages/help.html',
  '/pages/about.html',
  '/pages/contact.html',
];
const cliNavRoutes = new Set(['/logs/']);
const viewports = [
  { name: 'desktop', width: 1365, height: 768, deviceScaleFactor: 1, mobile: false },
  { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
];

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
};

const browserCandidates = [
  process.env.CHROME_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
].filter(Boolean).filter((candidate, index, candidates) => candidates.indexOf(candidate) === index);

const availableBrowsers = browserCandidates.filter((candidate) => existsSync(candidate));

if (!existsSync(join(distDir, 'index.html'))) {
  errors.push('dist/index.html is missing; run pnpm build before visual checks');
}

if (!availableBrowsers.length) {
  errors.push('Chrome or Edge executable was not found; set CHROME_PATH to enable visual checks');
}

if (errors.length) {
  const onlyBrowserSetupFailures = errors.every((error) => error.startsWith('visual check setup failed:'));
  if (onlyBrowserSetupFailures && process.env.CI !== 'true' && process.env.BYTEFORGE_VISUAL_STRICT !== '1') {
    for (const error of errors) console.warn(`WARN ${error}`);
    console.warn('WARN Visual browser checks skipped locally; set BYTEFORGE_VISUAL_STRICT=1 to require them.');
    process.exit(0);
  }

  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

const serveStatic = () => new Promise((resolveServer) => {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');

    if (url.pathname.startsWith('/api/')) {
      response.writeHead(204, { 'content-type': 'application/json; charset=utf-8' });
      response.end();
      return;
    }

    let filePath = join(distDir, decodeURIComponent(url.pathname));

    if (url.pathname.endsWith('/')) filePath = join(filePath, 'index.html');
    if (!extname(filePath) && existsSync(join(filePath, 'index.html'))) {
      filePath = join(filePath, 'index.html');
    }

    if (!filePath.startsWith(distDir) || !existsSync(filePath)) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(readFileSync(filePath));
  });

  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    resolveServer({ server, origin: `http://127.0.0.1:${address.port}` });
  });
});

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

const withTimeout = (promise, timeoutMs, label) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  promise.then(
    (value) => {
      clearTimeout(timer);
      resolve(value);
    },
    (error) => {
      clearTimeout(timer);
      reject(error);
    },
  );
});

const stopBrowser = (browserProcess) => new Promise((resolveStop) => {
  if (browserProcess.exitCode !== null) {
    resolveStop();
    return;
  }

  browserProcess.once('exit', resolveStop);
  browserProcess.kill();
  setTimeout(resolveStop, 3000);
});

const removeWithRetry = async (targetPath) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(targetPath, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      return;
    } catch (error) {
      if (!['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error.code) || attempt === 7) throw error;
      await wait(250);
    }
  }
};

const startBrowser = async (browserPath) => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'byteforge-visual-'));
  const browserProcess = spawn(browserPath, [
    '--headless=new',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--disable-background-networking',
    '--disable-gpu',
    '--disable-gpu-sandbox',
    '--disable-dev-shm-usage',
    '--use-angle=swiftshader',
    '--use-gl=swiftshader',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
    '--remote-allow-origins=*',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const wsUrl = await new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('Timed out waiting for browser DevTools endpoint')), 15000);

    browserProcess.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolveUrl(match[1]);
      }
    });

    browserProcess.on('exit', (code) => {
      clearTimeout(timer);
      rejectUrl(new Error(`Browser exited before DevTools was ready: ${code}`));
    });
  });

  const port = new URL(wsUrl).port;
  const pageResponse = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const pageTarget = await pageResponse.json();

  return {
    browserProcess,
    browserPath,
    browserWsUrl: wsUrl,
    targetId: pageTarget.id,
    pageWsUrl: pageTarget.webSocketDebuggerUrl,
    userDataDir,
  };
};

const createCdpClient = (wsUrl, targetId = null) => new Promise((resolveClient, rejectClient) => {
  const socket = new WebSocket(wsUrl);
  let nextId = 1;
  let pageSessionId = null;
  const pending = new Map();
  const eventHandlers = new Map();

  socket.onopen = () => {
    const client = {
      on(method, handler) {
        const handlers = eventHandlers.get(method) || [];
        handlers.push(handler);
        eventHandlers.set(method, handlers);
      },
      send(method, params = {}) {
        const id = nextId;
        nextId += 1;
        const message = { id, method, params };
        if (pageSessionId && !method.startsWith('Target.')) message.sessionId = pageSessionId;
        socket.send(JSON.stringify(message));
        return new Promise((resolveSend, rejectSend) => {
          const timer = setTimeout(() => {
            pending.delete(id);
            rejectSend(new Error(`CDP ${method} timed out after ${cdpCommandTimeoutMs}ms`));
          }, cdpCommandTimeoutMs);

          pending.set(id, {
            resolve: (value) => {
              clearTimeout(timer);
              resolveSend(value);
            },
            reject: (error) => {
              clearTimeout(timer);
              rejectSend(error);
            },
          });
        });
      },
      close() {
        socket.close();
      },
    };

    if (!targetId) {
      resolveClient(client);
      return;
    }

    client.send('Target.attachToTarget', { targetId, flatten: true })
      .then((result) => {
        pageSessionId = result.sessionId;
        resolveClient(client);
      })
      .catch(rejectClient);
  };

  socket.onerror = () => rejectClient(new Error('Unable to connect to browser DevTools websocket'));

  socket.onmessage = async (event) => {
    const raw = event.data instanceof Blob
      ? await event.data.text()
      : Buffer.isBuffer(event.data)
        ? event.data.toString('utf8')
        : event.data instanceof ArrayBuffer
          ? Buffer.from(event.data).toString('utf8')
          : String(event.data);
    const message = JSON.parse(raw);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) {
        request.reject(new Error(message.error.message));
      } else {
        request.resolve(message.result);
      }
      return;
    }

    for (const handler of eventHandlers.get(message.method) || []) {
      handler(message.params);
    }
  };
});

const startCompatibleBrowser = async () => {
  const failures = [];

  for (const browserPath of availableBrowsers) {
    let browser;
    let client;

    try {
      browser = await withTimeout(startBrowser(browserPath), 20000, `browser startup ${browserPath}`);
      client = await withTimeout(createCdpClient(browser.browserWsUrl, browser.targetId), 10000, `DevTools connection ${browserPath}`);
      await client.send('Page.enable');
      return { browser, client };
    } catch (error) {
      failures.push(`${browserPath}: ${error.message}`);
      client?.close();
      if (browser?.browserProcess) await stopBrowser(browser.browserProcess);
      if (browser?.userDataDir) await removeWithRetry(browser.userDataDir);
    }
  }

  throw new Error(`No compatible headless browser found. ${failures.join(' | ')}`);
};

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
};

const readUint32 = (buffer, offset) => buffer.readUInt32BE(offset);

const screenshotStats = (base64Png) => {
  const png = Buffer.from(base64Png, 'base64');
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < png.length) {
    const length = readUint32(png, offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === 'IHDR') {
      width = readUint32(png, dataStart);
      height = readUint32(png, dataStart + 4);
      colorType = png[dataStart + 9];
    } else if (type === 'IDAT') {
      idatChunks.push(png.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const rowLength = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const rows = [];
  let inputOffset = 0;
  const colors = new Set();
  let sampled = 0;
  let nonWhite = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const row = Buffer.from(inflated.subarray(inputOffset, inputOffset + rowLength));
    inputOffset += rowLength;
    const previous = rows[y - 1] || Buffer.alloc(rowLength);

    for (let x = 0; x < rowLength; x += 1) {
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = previous[x] || 0;
      const upperLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] || 0 : 0;

      if (filter === 1) row[x] = (row[x] + left) & 255;
      if (filter === 2) row[x] = (row[x] + up) & 255;
      if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      if (filter === 4) row[x] = (row[x] + paeth(left, up, upperLeft)) & 255;
    }

    rows.push(row);

    for (let x = 0; x < width; x += 12) {
      const pixelOffset = x * bytesPerPixel;
      const r = row[pixelOffset];
      const g = bytesPerPixel > 1 ? row[pixelOffset + 1] : r;
      const b = bytesPerPixel > 1 ? row[pixelOffset + 2] : r;
      sampled += 1;
      if (!(r > 245 && g > 245 && b > 245)) nonWhite += 1;
      colors.add(`${r >> 4}:${g >> 4}:${b >> 4}`);
    }
  }

  return {
    colorBuckets: colors.size,
    nonWhiteRatio: sampled ? nonWhite / sampled : 0,
  };
};

const evaluatePageState = async (client) => {
  const result = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const pick = (selector) => document.querySelector(selector);
      const style = (selector) => {
        const node = pick(selector);
        return node ? getComputedStyle(node) : null;
      };
      const hubStyle = style('.hub-v2');
      const pageStyle = style('.baseline-page');
      const routeView = pick('[data-route-view]');
      const routeMeta = pick('[data-route-meta]');
      const archiveIndex = pick('[data-archive-index]');
      const documentView = pick('[data-document-view]');
      const searchFilters = pick('[data-search-filters]');
      const searchInput = pick('[data-route-search]');
      const activeNav = [...document.querySelectorAll('.cli-nav a.active')].map((node) => node.textContent.trim());
      const activeFilterValues = [...document.querySelectorAll('[data-filter-button].is-active')]
        .map((node) => node.dataset.filterButton + ':' + node.dataset.filterValue);
      return {
        title: document.title,
        cssHrefs: [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean),
        baselineExists: Boolean(pick('.baseline-page')),
        hubExists: Boolean(pick('[data-boot-scope="byteforge-home"]')),
        audioToggleExists: Boolean(pick('[data-audio-toggle]')),
        navLinkCount: document.querySelectorAll('.cli-nav a').length,
        activeNavCount: activeNav.length,
        routeViewVisible: Boolean(routeView && !routeView.hidden && routeView.textContent.trim().length > 20),
        routeTitle: pick('.route-title')?.textContent.trim() || '',
        routeMetaText: routeMeta?.textContent.trim() || '',
        archiveIndexText: archiveIndex?.textContent.trim() || '',
        documentViewText: documentView?.textContent.trim() || '',
        searchFilterText: searchFilters?.textContent.trim() || '',
        searchInputValue: searchInput?.value || '',
        activeFilterValues,
        selectedCategory: pick('[data-filter-select="category"]')?.value || '',
        selectedSeries: pick('[data-filter-select="series"]')?.value || '',
        routeEntryCount: document.querySelectorAll('.route-entry').length,
        hubPosition: hubStyle?.position || '',
        pageMinHeight: pageStyle?.minHeight || '',
        bodyFont: getComputedStyle(document.body).fontFamily,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        textLength: document.body.innerText.trim().length,
      };
    })()`,
  });

  return result.result.value;
};

const isPageReady = async (client) => {
  const result = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `document.readyState === 'complete' && Boolean(document.querySelector('[data-boot-scope="byteforge-home"]'))`,
  });

  return Boolean(result.result.value);
};

const waitForLoad = async (client, url) => {
  await client.send('Page.navigate', { url });
  const deadline = Date.now() + routeTimeoutMs;

  while (Date.now() < deadline) {
    if (await isPageReady(client)) {
      await wait(250);
      return;
    }
    await wait(100);
  }

  throw new Error(`load ${url} timed out after ${routeTimeoutMs}ms`);
};

const checkRouteRender = async (client, origin, route, viewport, browserErrors) => {
  browserErrors.length = 0;
  await waitForLoad(client, `${origin}${route}`);
  const state = await evaluatePageState(client);
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const stats = screenshotStats(screenshot.data);
  const context = `${viewport.name} ${route}`;
  const routePathname = new URL(route, 'https://byteforge.test').pathname;

  if (!state.baselineExists || !state.hubExists) errors.push(`${context}: app shell is missing`);
  if (!state.audioToggleExists) errors.push(`${context}: audio toggle is missing`);
  if (state.navLinkCount < 3) errors.push(`${context}: CLI navigation links are missing`);
  if (!state.cssHrefs.some((href) => href.includes('/assets/') && href.endsWith('.css'))) {
    errors.push(`${context}: bundled stylesheet is not loaded`);
  }
  if (state.hubPosition === 'static' || state.bodyFont.includes('Times New Roman')) {
    errors.push(`${context}: computed styles look like unstyled HTML`);
  }
  if (routePathname !== '/' && (!state.routeViewVisible || !state.routeTitle)) {
    errors.push(`${context}: route content panel is not visible`);
  }
  if (!routePathname.startsWith('/documents/') && routePathname !== '/' && (!state.routeMetaText.includes('entries') || !state.routeMetaText.includes('tags'))) {
    errors.push(`${context}: route content metadata is missing`);
  }
  if (routePathname === '/search/' && (!state.searchFilterText.includes('collection') || !state.searchFilterText.includes('category') || !state.searchFilterText.includes('series'))) {
    errors.push(`${context}: search filter controls are missing`);
  }
  if (routePathname === '/archive/' && (!state.archiveIndexText.includes('timeline') || !state.archiveIndexText.includes('category') || !state.archiveIndexText.includes('series') || !state.archiveIndexText.includes('tag'))) {
    errors.push(`${context}: archive index groups are missing`);
  }
  if (routePathname.startsWith('/documents/') && (!state.documentViewText.includes('collection') || !state.documentViewText.includes('RSS') || !state.documentViewText.includes('Pagefind'))) {
    errors.push(`${context}: document detail view is missing`);
  }
  if (route.includes('?') && (
    state.searchInputValue !== 'vite' ||
    !state.activeFilterValues.includes('collection:logs') ||
    !state.activeFilterValues.includes('tag:vite') ||
    state.selectedCategory !== 'Engineering' ||
    state.selectedSeries !== 'Build Journal' ||
    state.routeEntryCount < 1
  )) {
    errors.push(`${context}: search filter URL state was not restored`);
  }
  if (cliNavRoutes.has(routePathname) && state.activeNavCount !== 1) {
    errors.push(`${context}: exactly one navigation item should be active`);
  }
  if (state.scrollWidth > state.clientWidth + 4) {
    errors.push(`${context}: horizontal overflow detected (${state.scrollWidth}px > ${state.clientWidth}px)`);
  }
  if (stats.nonWhiteRatio < 0.2 || stats.colorBuckets < 12) {
    errors.push(`${context}: screenshot looks blank or visually unstyled`);
  }
  if (browserErrors.length) {
    errors.push(`${context}: ${browserErrors.join('; ')}`);
  }
};

const evaluateStandaloneState = async (client) => {
  const result = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const pick = (selector) => document.querySelector(selector);
      const hero = pick('.page-hero') || pick('.nav-header');
      const heroRect = hero?.getBoundingClientRect();
      const themeHrefs = [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean);
      const bodyBefore = getComputedStyle(document.body, '::before');
      return {
        title: document.title,
        themeLoaded: themeHrefs.some((href) => href.endsWith('/styles/ink-sci-fi.css')),
        mainExists: Boolean(pick('#main-content')),
        skipLinkExists: pick('.skip-link')?.getAttribute('href') === '#main-content',
        pageTitle: (pick('.page-title') || pick('.header-title'))?.textContent.trim() || '',
        heroWidth: heroRect?.width || 0,
        heroHeight: heroRect?.height || 0,
        surfaceCount: document.querySelectorAll('.panel, .tile, .nav-card').length,
        navCardCount: document.querySelectorAll('.nav-card').length,
        relayCardCount: document.querySelectorAll('.relay-card[target="_blank"][rel="noopener noreferrer"]').length,
        relayLogoLoaded: [...document.querySelectorAll('.relay-logo')].every((image) => image.complete && image.naturalWidth > 0),
        inkBackground: bodyBefore.backgroundImage,
        bodyFont: getComputedStyle(document.body).fontFamily,
        accent: getComputedStyle(document.body).getPropertyValue('--ink-accent').trim(),
        canvasHidden: pick('canvas')?.getAttribute('aria-hidden') === 'true',
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        textLength: document.body.innerText.trim().length,
      };
    })()`,
  });

  return result.result.value;
};

const isStandaloneReady = async (client) => {
  const result = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `document.readyState === 'complete' && Boolean(document.querySelector('#main-content')) && [...document.styleSheets].some((sheet) => sheet.href?.endsWith('/styles/ink-sci-fi.css'))`,
  });

  return Boolean(result.result.value);
};

const waitForStandaloneLoad = async (client, url) => {
  await client.send('Page.navigate', { url });
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    if (await isStandaloneReady(client)) {
      await wait(350);
      return;
    }
    await wait(100);
  }

  throw new Error(`load ${url} timed out after 5000ms`);
};

const checkStandaloneRender = async (client, origin, route, viewport, browserErrors) => {
  browserErrors.length = 0;
  await waitForStandaloneLoad(client, `${origin}${route}`);
  const state = await evaluateStandaloneState(client);
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const stats = screenshotStats(screenshot.data);
  const context = `${viewport.name} ${route}`;

  if (!state.themeLoaded || !state.inkBackground.includes('ink-horizon.svg')) {
    errors.push(`${context}: ink sci-fi theme is not active`);
  }
  if (!state.mainExists || !state.skipLinkExists || !state.canvasHidden) {
    errors.push(`${context}: standalone page accessibility shell is incomplete`);
  }
  if (!state.pageTitle || state.textLength < 80) {
    errors.push(`${context}: standalone page content is missing`);
  }
  if (state.heroWidth < 240 || state.heroHeight < 140 || state.surfaceCount < 2) {
    errors.push(`${context}: standalone page layout surfaces are missing`);
  }
  if (route === '/pages/nav.html' && state.navCardCount < 18) {
    errors.push(`${context}: navigation center is missing standalone route cards`);
  }
  if (route === '/pages/nav.html' && (state.relayCardCount !== 2 || !state.relayLogoLoaded)) {
    errors.push(`${context}: relay entries or relay logo failed to render`);
  }
  if (!state.accent || state.bodyFont.includes('Times New Roman')) {
    errors.push(`${context}: computed theme styles look unstyled`);
  }
  if (state.scrollWidth > state.clientWidth + 4) {
    errors.push(`${context}: horizontal overflow detected (${state.scrollWidth}px > ${state.clientWidth}px)`);
  }
  if (stats.nonWhiteRatio < 0.2 || stats.colorBuckets < 12) {
    errors.push(`${context}: screenshot looks blank or visually unstyled`);
  }
  if (browserErrors.length) {
    errors.push(`${context}: ${browserErrors.join('; ')}`);
  }
};

const runVisualChecks = async () => {
  const { server, origin } = await serveStatic();
  let browser;
  let client;
  const browserErrors = [];
  let shouldAbort = false;

  try {
    ({ browser, client } = await startCompatibleBrowser());

    client.on('Runtime.exceptionThrown', (event) => {
      browserErrors.push(`exception: ${event.exceptionDetails?.text || 'runtime exception'}`);
    });
    client.on('Runtime.consoleAPICalled', (event) => {
      if (event.type === 'error') browserErrors.push(`console error: ${event.args?.map((arg) => arg.value || arg.description).join(' ')}`);
    });
    client.on('Log.entryAdded', (event) => {
      if (event.entry?.level === 'error') browserErrors.push(`browser log: ${event.entry.text}`);
    });
    client.on('Network.loadingFailed', (event) => {
      if (!event.canceled) browserErrors.push(`network failed: ${event.errorText}`);
    });

    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Log.enable');

    for (const viewport of viewports) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.deviceScaleFactor,
        mobile: viewport.mobile,
      });

      for (const route of routes) {
        const context = `${viewport.name} ${route}`;
        try {
          await withTimeout(checkRouteRender(client, origin, route, viewport, browserErrors), routeTimeoutMs, context);
        } catch (error) {
          errors.push(`${context}: ${error.message}`);
          if (error.message.includes('timed out')) {
            shouldAbort = true;
            break;
          }
        }
      }

      for (const route of standaloneRoutes) {
        const context = `${viewport.name} ${route}`;
        try {
          await withTimeout(checkStandaloneRender(client, origin, route, viewport, browserErrors), routeTimeoutMs, context);
        } catch (error) {
          errors.push(`${context}: ${error.message}`);
          if (error.message.includes('timed out')) {
            shouldAbort = true;
            break;
          }
        }
      }

      if (shouldAbort) break;
    }
  } catch (error) {
    errors.push(`visual check setup failed: ${error.message}`);
  } finally {
    client?.close();
    if (browser?.browserProcess) await stopBrowser(browser.browserProcess);
    server.close();
    if (browser?.userDataDir) await removeWithRetry(browser.userDataDir);
  }
};

await runVisualChecks();

if (errors.length) {
  const onlyBrowserSetupFailures = errors.every((error) => error.startsWith('visual check setup failed:'));
  const strictVisualChecks = process.env.GITHUB_ACTIONS === 'true' || process.env.BYTEFORGE_VISUAL_STRICT === '1';

  if (onlyBrowserSetupFailures && !strictVisualChecks) {
    for (const error of errors) console.warn(`WARN ${error}`);
    console.warn('WARN Visual browser checks skipped locally; set BYTEFORGE_VISUAL_STRICT=1 to require them.');
    process.exit(0);
  }

  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`Visual check passed: ${routes.length + standaloneRoutes.length} routes across ${viewports.length} viewports.`);
