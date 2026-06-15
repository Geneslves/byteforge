const API_BASE = location.hostname === 'localhost'
  ? 'http://localhost:8788'
  : '';

async function loadAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/analytics`);
    const data = await res.json();

    if (data.ok) {
      document.getElementById('total-feedback').textContent = data.stats.total_feedback || 0;
      document.getElementById('total-views').textContent = data.stats.total_views || 0;
      document.getElementById('total-clicks').textContent = data.stats.total_clicks || 0;
      document.getElementById('total-searches').textContent = data.stats.total_searches || 0;

      const topDocsList = document.getElementById('top-docs-list');
      if (data.topDocuments && data.topDocuments.length > 0) {
        topDocsList.innerHTML = data.topDocuments
          .map(doc => `<li><strong>${doc.document_id}</strong>: ${doc.views} 次浏览</li>`)
          .join('');
      } else {
        topDocsList.innerHTML = '<li class="empty">暂无数据</li>';
      }
    } else {
      showError('加载分析数据失败: ' + data.error);
    }
  } catch (error) {
    showError('网络错误: ' + error.message);
  }
}

async function loadFeedback() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/feedback?limit=20`);
    const data = await res.json();

    if (data.ok) {
      const tbody = document.getElementById('feedback-tbody');
      if (data.data && data.data.length > 0) {
        tbody.innerHTML = data.data
          .map(item => `
            <tr>
              <td class="time-cell">${formatDate(item.created_at)}</td>
              <td class="route-cell">${escapeHtml(item.route_path)}</td>
              <td class="doc-cell">${item.document_id ? escapeHtml(item.document_id) : '-'}</td>
              <td class="message-cell">${escapeHtml(item.message)}</td>
            </tr>
          `)
          .join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">暂无反馈数据</td></tr>';
      }
    } else {
      showError('加载反馈数据失败: ' + data.error);
    }
  } catch (error) {
    showError('网络错误: ' + error.message);
  }
}

function formatDate(isoString) {
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

function showError(message) {
  const container = document.querySelector('.admin-container');
  const error = document.createElement('div');
  error.className = 'error-toast';
  error.textContent = message;
  container.appendChild(error);
  setTimeout(() => error.remove(), 5000);
}

function refreshAll() {
  loadAnalytics();
  loadFeedback();
}

document.addEventListener('DOMContentLoaded', () => {
  refreshAll();

  document.getElementById('refresh-btn').addEventListener('click', () => {
    refreshAll();
  });

  // 每分钟自动刷新
  setInterval(refreshAll, 60000);
});
