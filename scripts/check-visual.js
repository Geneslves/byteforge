import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { inflateSync } from 'node:zlib';

const distDir = resolve('dist');
const errors = [];
const routes = ['/', '/logs/', '/deployments/', '/search/', '/academic/'];
const cliNavRoutes = new Set(['/logs/', '/deployments/', '/search/']);
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

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
].filter(Boolean);

const chromePath = chromeCandidates.find((candidate) => existsSync(candidate));

if (!existsSync(join(distDir, 'index.html'))) {
  errors.push('dist/index.html is missing; run pnpm build before visual checks');
}

if (!chromePath) {
  errors.push('Chrome or Edge executable was not found; set CHROME_PATH to enable visual checks');
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

const serveStatic = () => new Promise((resolveServer) => {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
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

const startBrowser = async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'byteforge-visual-'));
  const browserProcess = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
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
    pageWsUrl: pageTarget.webSocketDebuggerUrl,
    userDataDir,
  };
};

const createCdpClient = (wsUrl) => new Promise((resolveClient, rejectClient) => {
  const socket = new WebSocket(wsUrl);
  let nextId = 1;
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
        socket.send(JSON.stringify({ id, method, params }));
        return new Promise((resolveSend, rejectSend) => {
          pending.set(id, { resolve: resolveSend, reject: rejectSend });
        });
      },
      close() {
        socket.close();
      },
    };

    resolveClient(client);
  };

  socket.onerror = () => rejectClient(new Error('Unable to connect to browser DevTools websocket'));

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
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
      const activeNav = [...document.querySelectorAll('.cli-nav a.active')].map((node) => node.textContent.trim());
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

const waitForLoad = async (client, url) => {
  let resolveLoad;
  const loadPromise = new Promise((resolve) => {
    resolveLoad = resolve;
  });
  client.on('Page.loadEventFired', resolveLoad);
  await client.send('Page.navigate', { url });
  await Promise.race([loadPromise, wait(10000)]);
  await wait(250);
};

const runVisualChecks = async () => {
  const { server, origin } = await serveStatic();
  const browser = await startBrowser();
  const client = await createCdpClient(browser.pageWsUrl);
  const browserErrors = [];

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

  try {
    await client.send('Page.enable');
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
        browserErrors.length = 0;
        await waitForLoad(client, `${origin}${route}`);
        const state = await evaluatePageState(client);
        const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
        const stats = screenshotStats(screenshot.data);
        const context = `${viewport.name} ${route}`;

        if (!state.baselineExists || !state.hubExists) errors.push(`${context}: app shell is missing`);
        if (!state.audioToggleExists) errors.push(`${context}: audio toggle is missing`);
        if (state.navLinkCount < 3) errors.push(`${context}: CLI navigation links are missing`);
        if (!state.cssHrefs.some((href) => href.includes('/assets/') && href.endsWith('.css'))) {
          errors.push(`${context}: bundled stylesheet is not loaded`);
        }
        if (state.hubPosition === 'static' || state.bodyFont.includes('Times New Roman')) {
          errors.push(`${context}: computed styles look like unstyled HTML`);
        }
        if (route !== '/' && (!state.routeViewVisible || !state.routeTitle)) {
          errors.push(`${context}: route content panel is not visible`);
        }
        if (route !== '/' && (!state.routeMetaText.includes('entries') || !state.routeMetaText.includes('tags'))) {
          errors.push(`${context}: route content metadata is missing`);
        }
        if (cliNavRoutes.has(route) && state.activeNavCount !== 1) {
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
      }
    }
  } finally {
    client.close();
    await stopBrowser(browser.browserProcess);
    server.close();
    await removeWithRetry(browser.userDataDir);
  }
};

await runVisualChecks();

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`Visual check passed: ${routes.length} routes across ${viewports.length} viewports.`);
