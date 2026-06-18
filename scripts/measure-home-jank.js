import { existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const targetUrl = process.argv[2] || 'http://localhost:3000/';
const waitMs = Number(process.argv[3] || 5200);
const scenario = process.argv[4] || 'baseline';

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
if (!chromePath) {
  console.error('ERROR Chrome or Edge executable was not found; set CHROME_PATH.');
  process.exit(1);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stopBrowser = (browserProcess) => new Promise((resolve) => {
  if (browserProcess.exitCode !== null) {
    resolve();
    return;
  }

  browserProcess.once('exit', resolve);
  browserProcess.kill();
  setTimeout(resolve, 3000);
});

const startBrowser = async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'byteforge-jank-'));
  const browserProcess = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-first-run',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const wsUrl = await new Promise((resolveUrl, rejectUrl) => {
    const timer = setTimeout(() => rejectUrl(new Error('Timed out waiting for DevTools endpoint')), 15000);

    browserProcess.stderr.on('data', (chunk) => {
      const match = chunk.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);
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
    resolveClient({
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
          const timer = setTimeout(() => {
            pending.delete(id);
            rejectSend(new Error(`Timed out waiting for CDP response: ${method}`));
          }, 8000);
          pending.set(id, {
            resolve(value) {
              clearTimeout(timer);
              resolveSend(value);
            },
            reject(error) {
              clearTimeout(timer);
              rejectSend(error);
            },
          });
        });
      },
      close() {
        socket.close();
      },
      socket,
    });
  };

  socket.onerror = () => rejectClient(new Error('Unable to connect to DevTools websocket'));
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

const summarizeWindow = (frames, start, end) => {
  const items = frames.filter((frame) => frame.t >= start && frame.t < end);
  const over50 = items.filter((frame) => frame.dt > 50).length;
  const over100 = items.filter((frame) => frame.dt > 100).length;
  const max = items.reduce((currentMax, frame) => Math.max(currentMax, frame.dt), 0);
  const avg = items.length
    ? items.reduce((sum, frame) => sum + frame.dt, 0) / items.length
    : 0;

  return {
    window: `${(start / 1000).toFixed(1)}-${(end / 1000).toFixed(1)}s`,
    frames: items.length,
    avg: Number(avg.toFixed(1)),
    max: Number(max.toFixed(1)),
    over50,
    over100,
  };
};

const browser = await startBrowser();
const client = await createCdpClient(browser.pageWsUrl);

try {
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1365,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      (() => {
        const scenario = ${JSON.stringify(scenario)};
        if (scenario === 'block-idle') {
          window.requestIdleCallback = () => 0;
          window.cancelIdleCallback = () => {};
        }
        if (scenario === 'disable-ambient') {
          const style = document.createElement('style');
          style.textContent = [
            '.star-glint,.stream-track,.edge-particle,.impact-bloom,.lightfield,.hotspot,.planet{animation:none!important;transition:none!important}',
            '.starfield,.datafield,.stage,.orbit-layer,.lightfield{transform:none!important}',
            '.boot-sequence{display:none!important}'
          ].join('\\n');
          document.documentElement.appendChild(style);
        }
        window.__byteforgeFrames = [];
        window.__byteforgeLongTasks = [];
        let first = 0;
        let last = 0;
        const tick = (now) => {
          if (!first) first = now;
          if (last) window.__byteforgeFrames.push({ t: now - first, dt: now - last });
          last = now;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__byteforgeLongTasks.push({
                name: entry.name,
                start: entry.startTime,
                duration: entry.duration,
              });
            }
          }).observe({ entryTypes: ['longtask'] });
        } catch {}
      })();
    `,
  });

  let loaded = false;
  client.on('Page.loadEventFired', () => {
    loaded = true;
  });

  await client.send('Page.navigate', { url: targetUrl });
  for (let elapsed = 0; elapsed < 10000 && !loaded; elapsed += 100) {
    await wait(100);
  }
  await wait(waitMs);

  const result = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const hub = document.querySelector('[data-boot-scope="byteforge-home"]');
      const boot = document.querySelector('.boot-sequence');
      const meteorCount = document.querySelectorAll('.meteor').length;
      return {
        readyState: document.readyState,
        hubClass: hub?.className || '',
        bootDisplay: boot ? getComputedStyle(boot).display : '',
        bootVisibility: boot ? getComputedStyle(boot).visibility : '',
        meteorCount,
        frames: window.__byteforgeFrames || [],
        longTasks: window.__byteforgeLongTasks || [],
      };
    })()`,
  });

  const value = result.result.value;
  const frames = value.frames || [];
  const windows = [];
  for (let start = 0; start < waitMs; start += 500) {
    windows.push(summarizeWindow(frames, start, start + 500));
  }
  const worstFrames = [...frames]
    .sort((a, b) => b.dt - a.dt)
    .slice(0, 12)
    .map((frame) => ({ t: Number(frame.t.toFixed(1)), dt: Number(frame.dt.toFixed(1)) }));
  const longTasks = (value.longTasks || [])
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 12)
    .map((task) => ({
      start: Number(task.start.toFixed(1)),
      duration: Number(task.duration.toFixed(1)),
      name: task.name,
    }));

  console.log(JSON.stringify({
    targetUrl,
    scenario,
    readyState: value.readyState,
    hubClass: value.hubClass,
    bootDisplay: value.bootDisplay,
    bootVisibility: value.bootVisibility,
    meteorCount: value.meteorCount,
    windows,
    worstFrames,
    longTasks,
  }, null, 2));
} finally {
  client.close();
  await stopBrowser(browser.browserProcess);
  await rm(browser.userDataDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
}
