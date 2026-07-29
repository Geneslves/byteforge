// ByteForge standalone page behavior

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';
const NOTIFICATION_KEY = 'byteforge:notifications-read';
const PREF_KEYS = {
  audio: 'byteforge:audio-enabled',
  compact: 'byteforge:compact-mode',
  reducedMotion: 'byteforge:reduced-motion',
};

function motionIsReduced() {
  return localStorage.getItem(PREF_KEYS.reducedMotion) === '1' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function applyLocalPreferences() {
  document.body.dataset.compact = localStorage.getItem(PREF_KEYS.compact) === '1' ? 'true' : 'false';
  document.body.dataset.reducedMotion = motionIsReduced() ? 'true' : 'false';
  document.dispatchEvent(new CustomEvent('byteforge:preferences'));
}

function safeParse(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getSession() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const user = safeParse(localStorage.getItem(USER_KEY), null);
  return {
    token,
    refreshToken,
    user,
    isLoggedIn: Boolean(token && user),
    isAdmin: user?.role === 'admin',
  };
}

function initialsFor(user) {
  const source = user?.username || user?.email || 'BF';
  return source.slice(0, 2).toUpperCase();
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((el) => {
    el.textContent = value;
  });
}

function setStatus(selector, message, type = '') {
  const el = document.querySelector(selector);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('ok', 'error');
  if (type) el.classList.add(type);
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function syncCommonSession() {
  const session = getSession();
  document.querySelectorAll('[data-auth-state]').forEach((el) => {
    el.textContent = session.isLoggedIn ? 'SIGNED IN' : 'GUEST';
    el.classList.toggle('ok', session.isLoggedIn);
    el.classList.toggle('warn', !session.isLoggedIn);
  });
  document.querySelectorAll('[data-user-name]').forEach((el) => {
    el.textContent = session.user?.username || '未登录';
  });
  document.querySelectorAll('[data-user-role]').forEach((el) => {
    el.textContent = session.user?.role || 'guest';
  });
  document.querySelectorAll('[data-user-email]').forEach((el) => {
    el.textContent = session.user?.email || '未绑定';
  });
  document.querySelectorAll('[data-token-state]').forEach((el) => {
    el.textContent = session.token ? 'AVAILABLE' : 'MISSING';
  });
  document.querySelectorAll('[data-refresh-state]').forEach((el) => {
    el.textContent = session.refreshToken ? 'AVAILABLE' : 'MISSING';
  });
  document.querySelectorAll('[data-avatar]').forEach((el) => {
    el.textContent = initialsFor(session.user);
  });

  document.querySelectorAll('[data-admin-only]').forEach((el) => {
    el.hidden = !session.isAdmin;
  });
}

async function refreshSession() {
  const session = getSession();
  if (!session.token) {
    setStatus('[data-session-status]', '未找到登录令牌，请先登录。', 'error');
    return;
  }

  setStatus('[data-session-status]', '正在校验会话...');
  try {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    syncCommonSession();
    setStatus('[data-session-status]', '会话有效，用户信息已更新。', 'ok');
  } catch (error) {
    setStatus('[data-session-status]', `会话校验失败：${error.message}`, 'error');
  }
}

function initProfilePage() {
  const session = getSession();
  const signedIn = document.querySelector('[data-signed-in]');
  const signedOut = document.querySelector('[data-signed-out]');
  if (signedIn && signedOut) {
    signedIn.classList.toggle('active', session.isLoggedIn);
    signedOut.classList.toggle('active', !session.isLoggedIn);
  }

  setText('[data-profile-title]', session.user?.username || '访客');
  setText('[data-profile-subtitle]', session.user?.email || '登录后显示账户资料与会话状态');
  setText('[data-profile-id]', session.user?.id || 'N/A');
  setText('[data-profile-role]', session.user?.role || 'guest');
  setText('[data-profile-email]', session.user?.email || 'N/A');
  setText('[data-profile-session]', session.token ? 'active' : 'inactive');
}

function initAccountPage() {
  const preferences = [
    ['audio', (value) => (value ? '1' : '0')],
    ['compact', (value) => (value ? '1' : '0')],
    ['reducedMotion', (value) => (value ? '1' : '0')],
  ];

  for (const [name] of preferences) {
    const input = document.querySelector(`[data-pref="${name}"]`);
    if (!input) continue;
    input.checked = localStorage.getItem(PREF_KEYS[name]) === '1';
    input.addEventListener('change', () => {
      localStorage.setItem(PREF_KEYS[name], input.checked ? '1' : '0');
      applyLocalPreferences();
      setStatus('[data-preference-status]', '本地偏好已保存。', 'ok');
    });
  }
}

const DEFAULT_NOTICES = [
  {
    id: 'release-pages',
    title: '独立页面入口已加入导航中心',
    body: '个人中心、账号设置、通知、帮助、关于和联系页面现在可直接访问。',
    time: '系统通知',
  },
  {
    id: 'auth-session',
    title: '账号页支持会话自检',
    body: '登录后可在账号设置页请求 /api/auth/me 校验当前令牌。',
    time: '账号安全',
  },
  {
    id: 'feedback-channel',
    title: '反馈表单接入公开接口',
    body: '联系页面会把反馈提交到 /api/feedback，并保留 mailto 备用入口。',
    time: '站点反馈',
  },
];

function readNoticeState() {
  return new Set(safeParse(localStorage.getItem(NOTIFICATION_KEY), []));
}

function writeNoticeState(readIds) {
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify([...readIds]));
}

function renderNotifications() {
  const list = document.querySelector('[data-notification-list]');
  if (!list) return;
  const readIds = readNoticeState();
  list.innerHTML = '';

  for (const notice of DEFAULT_NOTICES) {
    const item = document.createElement('li');
    item.className = `notice-item${readIds.has(notice.id) ? ' read' : ''}`;
    item.innerHTML = `
      <button class="notice-action" type="button" aria-pressed="${readIds.has(notice.id)}">
        <span class="notice-dot" aria-hidden="true"></span>
        <span>
          <strong class="notice-title">${notice.title}</strong>
          <span class="notice-copy">${notice.body}</span>
        </span>
        <span class="notice-time">${notice.time}</span>
      </button>
    `;
    item.querySelector('.notice-action').addEventListener('click', () => {
      readIds.add(notice.id);
      writeNoticeState(readIds);
      renderNotifications();
    });
    list.appendChild(item);
  }

  const unread = DEFAULT_NOTICES.filter((notice) => !readIds.has(notice.id)).length;
  setText('[data-unread-count]', String(unread));
  setText('[data-total-count]', String(DEFAULT_NOTICES.length));
}

async function checkHealth() {
  const rows = [
    ['/api/health/live', '[data-live-status]'],
    ['/api/health/ready', '[data-ready-status]'],
  ];

  await Promise.all(rows.map(async ([path, selector]) => {
    setText(selector, 'CHECKING');
    try {
      const response = await fetch(path, { cache: 'no-store' });
      setText(selector, response.ok ? 'OK' : `HTTP ${response.status}`);
    } catch {
      setText(selector, 'UNREACHABLE');
    }
  }));
}

function initContactPage() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const routePath = formData.get('routePath') || '/pages/contact.html';
    const message = String(formData.get('message') || '').trim();

    if (message.length < 2) {
      setStatus('[data-contact-status]', '反馈内容至少需要 2 个字符。', 'error');
      return;
    }

    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    setStatus('[data-contact-status]', '正在提交反馈...');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routePath,
          message,
          userAgent: navigator.userAgent,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      form.reset();
      setStatus('[data-contact-status]', `已提交，编号 ${data.id}`, 'ok');
    } catch (error) {
      setStatus('[data-contact-status]', `提交失败：${error.message}`, 'error');
    } finally {
      button.disabled = false;
    }
  });
}

function initBackground() {
  const canvas = document.getElementById('page-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let animationFrameId = null;
  const dots = Array.from({ length: 42 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.8 + 0.6,
    dx: (Math.random() - 0.5) * 0.00035,
    dy: (Math.random() - 0.5) * 0.00035,
  }));

  const draw = () => {
    animationFrameId = null;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 56) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (const dot of dots) {
      dot.x = (dot.x + dot.dx + 1) % 1;
      dot.y = (dot.y + dot.dy + 1) % 1;
      ctx.fillStyle = 'rgba(139, 92, 246, 0.58)';
      ctx.beginPath();
      ctx.arc(dot.x * width, dot.y * height, dot.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!document.hidden && !motionIsReduced()) {
      animationFrameId = requestAnimationFrame(draw);
    }
  };

  const syncMotion = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (!document.hidden) draw();
  };

  document.addEventListener('byteforge:preferences', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
}

function bindActions() {
  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', () => {
      clearSession();
      syncCommonSession();
      initProfilePage();
      setStatus('[data-session-status]', '已退出当前会话。', 'ok');
    });
  });

  document.querySelectorAll('[data-refresh-session]').forEach((button) => {
    button.addEventListener('click', refreshSession);
  });

  document.querySelectorAll('[data-mark-all-read]').forEach((button) => {
    button.addEventListener('click', () => {
      writeNoticeState(new Set(DEFAULT_NOTICES.map((notice) => notice.id)));
      renderNotifications();
    });
  });

  document.querySelectorAll('[data-clear-notices]').forEach((button) => {
    button.addEventListener('click', () => {
      localStorage.removeItem(NOTIFICATION_KEY);
      renderNotifications();
    });
  });

  document.querySelectorAll('[data-check-health]').forEach((button) => {
    button.addEventListener('click', checkHealth);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyLocalPreferences();
  initBackground();
  syncCommonSession();
  bindActions();

  const page = document.body.dataset.page;
  if (page === 'profile') initProfilePage();
  if (page === 'account') initAccountPage();
  if (page === 'notifications') renderNotifications();
  if (page === 'help') checkHealth();
  if (page === 'contact') initContactPage();
});
