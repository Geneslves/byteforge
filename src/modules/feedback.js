const API_BASE = location.hostname === 'localhost'
  ? 'http://localhost:8788'
  : '';

export async function submitFeedback(routePath, message, documentId = null) {
  try {
    const response = await fetch(`${API_BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routePath, documentId, message }),
    });

    const data = await response.json();
    return data.ok ? { success: true, id: data.id } : { success: false, error: data.error };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function trackEvent(routePath, eventType, documentId = null) {
  try {
    await fetch(`${API_BASE}/api/content-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routePath, documentId, eventType }),
    });
  } catch (error) {
    // 静默失败，不影响用户体验
  }
}

export function initFeedbackForm(container, documentData) {
  const form = container.querySelector('[data-feedback-form]');
  if (!form) return;

  const textarea = form.querySelector('textarea');
  const submitBtn = form.querySelector('[type="submit"]');
  const statusMsg = form.querySelector('[data-status]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = textarea.value.trim();
    if (message.length < 2) {
      statusMsg.textContent = '反馈内容太短（至少 2 个字符）';
      statusMsg.style.color = 'var(--red)';
      return;
    }

    submitBtn.disabled = true;
    statusMsg.textContent = '提交中...';
    statusMsg.style.color = 'var(--fg)';

    const result = await submitFeedback(
      documentData.path,
      message,
      documentData.id
    );

    if (result.success) {
      statusMsg.textContent = '✓ 感谢你的反馈！';
      statusMsg.style.color = 'var(--green)';
      textarea.value = '';
      setTimeout(() => {
        statusMsg.textContent = '';
      }, 3000);
    } else {
      statusMsg.textContent = `提交失败: ${result.error}`;
      statusMsg.style.color = 'var(--red)';
    }

    submitBtn.disabled = false;
  });
}
