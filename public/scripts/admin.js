// ByteForge 管理系统 V2 - JavaScript

const API_BASE = location.hostname === 'localhost' ? 'http://localhost:8788' : '';

function requireAdminToken() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    showToast('请先登录', 'error');
    setTimeout(() => location.href = '/login.html?redirect=' + encodeURIComponent(location.pathname), 1000);
    throw new Error('missing_auth_token');
  }
  return token;
}

function adminFetch(path, options = {}) {
  const token = requireAdminToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

let currentView = 'dashboard';
let autoRefreshInterval = null;
let feedbackData = [];
let contentData = [];

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initAutoRefresh();
  loadDashboard();

  // 搜索和筛选
  document.getElementById('feedback-search')?.addEventListener('input', filterFeedback);
  document.getElementById('feedback-filter-doc')?.addEventListener('change', filterFeedback);
  document.getElementById('feedback-sort')?.addEventListener('change', filterFeedback);
  document.getElementById('content-search')?.addEventListener('input', filterContent);
  document.getElementById('content-sort')?.addEventListener('change', filterContent);

  // 刷新按钮
  document.getElementById('refresh-btn')?.addEventListener('click', refreshCurrentView);
});

// ===== 导航 =====
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
    });
  });
}

function switchView(view) {
  currentView = view;

  // 更新导航状态
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });

  // 显示对应视图
  document.querySelectorAll('.view-container').forEach(container => {
    container.style.display = 'none';
  });
  document.getElementById(`view-${view}`).style.display = 'block';

  // 更新标题
  const titles = {
    dashboard: '仪表板',
    feedback: '反馈管理',
    content: '内容分析',
    events: '事件日志',
    users: '用户管理',
    settings: '系统设置'
  };
  document.querySelector('.page-title').textContent = titles[view] || view;

  // 加载数据
  refreshCurrentView();
}

function refreshCurrentView() {
  switch(currentView) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'feedback':
      loadFeedback();
      break;
    case 'content':
      loadContentStats();
      break;
    case 'events':
      loadEvents();
      break;
    case 'users':
      loadUsers();
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

// ===== 自动刷新 =====
function initAutoRefresh() {
  const checkbox = document.getElementById('auto-refresh');
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });
  startAutoRefresh();
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshInterval = setInterval(refreshCurrentView, 60000);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// ===== 仪表板 =====
async function loadDashboard() {
  try {
    const [analytics, feedback, content] = await Promise.all([
      adminFetch('/api/admin/analytics').then(r => r.json()),
      adminFetch('/api/admin/feedback?limit=5').then(r => r.json()),
      adminFetch('/api/admin/content-stats').then(r => r.json())
    ]);

    if (analytics.ok) {
      updateStats(analytics.stats);
    }

    if (feedback.ok) {
      renderRecentFeedback(feedback.data);
    }

    if (content.ok) {
      renderTopContent(content.stats.slice(0, 5));
    }
  } catch (error) {
    showToast('加载仪表板失败: ' + error.message, 'error');
  }
}

function updateStats(stats) {
  document.getElementById('total-feedback').textContent = stats.total_feedback || 0;
  document.getElementById('total-views').textContent = stats.total_views || 0;
  document.getElementById('total-clicks').textContent = stats.total_clicks || 0;
  document.getElementById('total-searches').textContent = stats.total_searches || 0;
}

function renderRecentFeedback(data) {
  const container = document.getElementById('recent-feedback');
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty">暂无反馈</p>';
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="feedback-item">
      <div class="feedback-meta">
        <span class="time">${formatTime(item.created_at)}</span>
        <span class="route">${escapeHtml(item.route_path)}</span>
      </div>
      <p class="feedback-message">${escapeHtml(item.message)}</p>
    </div>
  `).join('');
}

function renderTopContent(data) {
  const container = document.getElementById('top-content');
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty">暂无数据</p>';
    return;
  }

  container.innerHTML = data.map((item, index) => `
    <div class="top-item">
      <span class="rank">#${index + 1}</span>
      <span class="doc-id">${escapeHtml(item.document_id)}</span>
      <span class="views">${item.views} 浏览</span>
    </div>
  `).join('');
}

// ===== 反馈管理 =====
async function loadFeedback() {
  try {
    const res = await adminFetch('/api/admin/feedback?limit=100');
    const data = await res.json();

    if (data.ok) {
      feedbackData = data.data;
      updateFeedbackFilters();
      filterFeedback();
    }
  } catch (error) {
    showToast('加载反馈失败: ' + error.message, 'error');
  }
}

function updateFeedbackFilters() {
  const docFilter = document.getElementById('feedback-filter-doc');
  const docs = [...new Set(feedbackData.map(f => f.document_id).filter(Boolean))];

  docFilter.innerHTML = '<option value="">所有文档</option>' +
    docs.map(doc => `<option value="${escapeHtml(doc)}">${escapeHtml(doc)}</option>`).join('');
}

function filterFeedback() {
  const searchTerm = document.getElementById('feedback-search').value.toLowerCase();
  const docFilter = document.getElementById('feedback-filter-doc').value;
  const sortOrder = document.getElementById('feedback-sort').value;

  let filtered = feedbackData.filter(item => {
    const matchSearch = !searchTerm || item.message.toLowerCase().includes(searchTerm);
    const matchDoc = !docFilter || item.document_id === docFilter;
    return matchSearch && matchDoc;
  });

  if (sortOrder === 'oldest') {
    filtered.reverse();
  }

  renderFeedbackTable(filtered);
}

function renderFeedbackTable(data) {
  const tbody = document.querySelector('#feedback-table tbody');

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">无匹配结果</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(item => `
    <tr>
      <td class="time-cell">${formatDateTime(item.created_at)}</td>
      <td class="route-cell">${escapeHtml(item.route_path)}</td>
      <td class="doc-cell">${item.document_id ? escapeHtml(item.document_id) : '-'}</td>
      <td class="message-cell">${escapeHtml(item.message)}</td>
      <td class="actions-cell">
        <button class="btn-icon" onclick="deleteFeedback('${item.id}')" title="删除">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function deleteFeedback(id) {
  if (!confirm('确定要删除这条反馈吗？')) return;

  try {
    const res = await adminFetch(`/api/admin/feedback/delete/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.ok) {
      showToast('删除成功', 'success');
      loadFeedback();
    } else {
      showToast('删除失败: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('删除失败: ' + error.message, 'error');
  }
}

// ===== 内容分析 =====
async function loadContentStats() {
  try {
    const res = await adminFetch('/api/admin/content-stats');
    const data = await res.json();

    if (data.ok) {
      contentData = data.stats;
      filterContent();
    }
  } catch (error) {
    showToast('加载内容统计失败: ' + error.message, 'error');
  }
}

function filterContent() {
  const searchTerm = document.getElementById('content-search').value.toLowerCase();
  const sortBy = document.getElementById('content-sort').value;

  let filtered = contentData.filter(item =>
    !searchTerm || item.document_id.toLowerCase().includes(searchTerm)
  );

  // 排序
  filtered.sort((a, b) => {
    switch(sortBy) {
      case 'views':
        return b.views - a.views;
      case 'clicks':
        return b.clicks - a.clicks;
      case 'feedback':
        return b.feedback_count - a.feedback_count;
      case 'recent':
        return new Date(b.last_activity) - new Date(a.last_activity);
      default:
        return 0;
    }
  });

  renderContentTable(filtered);
}

function renderContentTable(data) {
  const tbody = document.querySelector('#content-table tbody');

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">无匹配结果</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(item => `
    <tr>
      <td class="doc-cell">${escapeHtml(item.document_id)}</td>
      <td class="stat-cell">${item.views || 0}</td>
      <td class="stat-cell">${item.clicks || 0}</td>
      <td class="stat-cell">${item.feedback_count || 0}</td>
      <td class="time-cell">${item.last_activity ? formatDateTime(item.last_activity) : '-'}</td>
      <td class="actions-cell">
        <button class="btn-icon" onclick="viewContentDetail('${escapeHtml(item.document_id)}')" title="详情">📊</button>
      </td>
    </tr>
  `).join('');
}

async function viewContentDetail(docId) {
  try {
    const res = await adminFetch(`/api/admin/content-stats?documentId=${encodeURIComponent(docId)}`);
    const data = await res.json();

    if (data.ok) {
      showContentDetailModal(docId, data);
    }
  } catch (error) {
    showToast('加载详情失败: ' + error.message, 'error');
  }
}

function showContentDetailModal(docId, data) {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = `文档详情: ${docId}`;

  const eventsByType = {};
  data.events.forEach(e => {
    if (!eventsByType[e.event_type]) eventsByType[e.event_type] = 0;
    eventsByType[e.event_type] += e.count;
  });

  body.innerHTML = `
    <div class="detail-stats">
      <div class="detail-stat">
        <span class="label">总浏览</span>
        <span class="value">${eventsByType.view || 0}</span>
      </div>
      <div class="detail-stat">
        <span class="label">总点击</span>
        <span class="value">${eventsByType.click || 0}</span>
      </div>
      <div class="detail-stat">
        <span class="label">总搜索</span>
        <span class="value">${eventsByType.search || 0}</span>
      </div>
      <div class="detail-stat">
        <span class="label">总反馈</span>
        <span class="value">${data.feedbackCount || 0}</span>
      </div>
    </div>
    <h4>最近活动</h4>
    <div class="activity-list">
      ${data.events.slice(0, 10).map(e => `
        <div class="activity-item">
          <span class="date">${e.date}</span>
          <span class="type">${getEventTypeLabel(e.event_type)}</span>
          <span class="count">${e.count} 次</span>
        </div>
      `).join('')}
    </div>
  `;

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('detail-modal').style.display = 'none';
}

// ===== 事件日志 =====
async function loadEvents() {
  // TODO: 需要新的 API 端点来获取事件列表
  const container = document.getElementById('events-list');
  container.innerHTML = '<p class="empty">事件日志功能开发中...</p>';
}

// ===== 用户管理 =====
let usersData = [];

async function loadUsers() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    showToast('请先登录', 'error');
    setTimeout(() => location.href = '/login.html?redirect=' + encodeURIComponent(location.pathname), 1000);
    return;
  }

  try {
    const res = await adminFetch('/api/admin/users');
    const data = await res.json();

    if (data.ok) {
      usersData = data.users;
      renderUsersTable(usersData);
    } else {
      showToast('加载用户失败: ' + data.error, 'error');
      if (data.error === 'invalid_token') {
        setTimeout(() => location.href = '/login.html?redirect=' + encodeURIComponent(location.pathname), 1000);
      }
    }
  } catch (error) {
    showToast('加载用户失败: ' + error.message, 'error');
  }
}

function renderUsersTable(users) {
  const tbody = document.querySelector('#users-table tbody');

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">暂无用户</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td class="doc-cell">${escapeHtml(user.username)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>
        <span class="badge badge-${user.role === 'admin' ? 'primary' : 'secondary'}">
          ${user.role === 'admin' ? '管理员' : '用户'}
        </span>
      </td>
      <td>
        <span class="badge badge-${user.is_active ? 'success' : 'danger'}">
          ${user.is_active ? '活跃' : '禁用'}
        </span>
      </td>
      <td class="time-cell">${formatDateTime(user.created_at)}</td>
      <td class="time-cell">${user.last_login ? formatDateTime(user.last_login) : '-'}</td>
      <td class="actions-cell">
        <button class="btn-icon" onclick="toggleUserStatus('${user.id}', ${!user.is_active})"
                title="${user.is_active ? '禁用' : '激活'}">
          ${user.is_active ? '🔒' : '🔓'}
        </button>
        <button class="btn-icon" onclick="toggleUserRole('${user.id}', '${user.role === 'admin' ? 'user' : 'admin'}')"
                title="切换角色">
          ${user.role === 'admin' ? '👤' : '👑'}
        </button>
      </td>
    </tr>
  `).join('');
}

async function toggleUserStatus(userId, newStatus) {
  const token = localStorage.getItem('auth_token');
  const action = newStatus ? '激活' : '禁用';

  if (!confirm(`确定要${action}此用户吗？`)) return;

  try {
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, isActive: newStatus })
    });

    const data = await res.json();

    if (data.ok) {
      showToast(`${action}成功`, 'success');
      loadUsers();
    } else {
      showToast(`${action}失败: ` + data.message, 'error');
    }
  } catch (error) {
    showToast(`${action}失败: ` + error.message, 'error');
  }
}

async function toggleUserRole(userId, newRole) {
  const token = localStorage.getItem('auth_token');
  const roleName = newRole === 'admin' ? '管理员' : '普通用户';

  if (!confirm(`确定要将此用户设置为${roleName}吗？`)) return;

  try {
    const res = await adminFetch('/api/admin/users', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, role: newRole })
    });

    const data = await res.json();

    if (data.ok) {
      showToast('角色更新成功', 'success');
      loadUsers();
    } else {
      showToast('角色更新失败: ' + data.message, 'error');
    }
  } catch (error) {
    showToast('角色更新失败: ' + error.message, 'error');
  }
}

// ===== 系统设置 =====
async function loadSettings() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    showToast('请先登录', 'error');
    setTimeout(() => location.href = '/login.html?redirect=' + encodeURIComponent(location.pathname), 1000);
    return;
  }

  try {
    const res = await adminFetch('/api/admin/settings');
    const data = await res.json();

    if (data.ok) {
      populateSettings(data.settings);
      initSettingsForm();
    } else {
      showToast('加载设置失败: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('加载设置失败: ' + error.message, 'error');
  }
}

function populateSettings(settings) {
  document.getElementById('setting-registration').checked = settings.registration_enabled === true;
  document.getElementById('setting-email-verify').checked = settings.require_email_verification === true;
  document.getElementById('setting-site-name').value = settings.site_name || 'ByteForge';
}

function initSettingsForm() {
  const form = document.getElementById('settings-form');
  if (form.dataset.initialized) return;

  form.addEventListener('submit', handleSettingsSave);
  form.dataset.initialized = 'true';
}

async function handleSettingsSave(e) {
  e.preventDefault();

  const token = localStorage.getItem('auth_token');
  const btn = document.getElementById('settings-save-btn');
  const errorEl = document.getElementById('settings-error');

  errorEl.textContent = '';
  btn.disabled = true;
  btn.textContent = '保存中...';

  const settings = {
    registration_enabled: document.getElementById('setting-registration').checked,
    require_email_verification: document.getElementById('setting-email-verify').checked,
    site_name: document.getElementById('setting-site-name').value.trim()
  };

  try {
    const res = await adminFetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ settings })
    });

    const data = await res.json();

    if (data.ok) {
      showToast('设置保存成功', 'success');
      btn.textContent = '保存设置';
      btn.disabled = false;
    } else {
      errorEl.textContent = '保存失败: ' + data.message;
      btn.textContent = '保存设置';
      btn.disabled = false;
    }
  } catch (error) {
    errorEl.textContent = '保存失败: ' + error.message;
    btn.textContent = '保存设置';
    btn.disabled = false;
  }
}

// 全局函数（供 HTML onclick 使用）
window.switchView = switchView;
window.deleteFeedback = deleteFeedback;
window.viewContentDetail = viewContentDetail;
window.closeModal = closeModal;
window.toggleUserStatus = toggleUserStatus;
window.toggleUserRole = toggleUserRole;
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getEventTypeLabel(type) {
  const labels = {
    view: '浏览',
    click: '点击',
    search: '搜索',
    share: '分享'
  };
  return labels[type] || type;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 全局函数（供 HTML onclick 使用）
window.switchView = switchView;
window.deleteFeedback = deleteFeedback;
window.viewContentDetail = viewContentDetail;
window.closeModal = closeModal;
