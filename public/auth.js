// Authentication page logic

const API_BASE = location.hostname === 'localhost' ? 'http://localhost:8788' : '';

let registrationEnabled = true;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkRegistrationStatus();
  initForms();
  initToggle();
});

// Check if registration is enabled
async function checkRegistrationStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    // Registration status will be checked when user clicks register
  } catch (error) {
    // Silently fail
  }
}

// Initialize forms
function initForms() {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
}

// Initialize toggle buttons
function initToggle() {
  document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterForm();
  });

  document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });

  document.getElementById('show-login-from-disabled').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });
}

function showLoginForm() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('registration-disabled').style.display = 'none';
  clearErrors();
}

async function showRegisterForm() {
  // Check if registration is enabled
  try {
    const testRes = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', email: '', password: '' })
    });
    const testData = await testRes.json();

    if (testData.error === 'registration_disabled') {
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('register-form').style.display = 'none';
      document.getElementById('registration-disabled').style.display = 'block';
      return;
    }
  } catch (error) {
    // Continue anyway
  }

  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
  document.getElementById('registration-disabled').style.display = 'none';
  clearErrors();
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');

  errorEl.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<span>登录中...</span>';

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.ok) {
      // Save token
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Show success
      errorEl.textContent = '✓ 登录成功！';
      errorEl.style.color = '#b8bb26';

      // Redirect
      setTimeout(() => {
        const redirect = new URLSearchParams(location.search).get('redirect') || '/';
        location.href = redirect;
      }, 500);
    } else {
      errorEl.textContent = getErrorMessage(data.error, data.message);
      btn.disabled = false;
      btn.innerHTML = '<span>登录</span>';
    }
  } catch (error) {
    errorEl.textContent = '网络错误: ' + error.message;
    btn.disabled = false;
    btn.innerHTML = '<span>登录</span>';
  }
}

// Handle register
async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;
  const btn = document.getElementById('register-btn');
  const errorEl = document.getElementById('register-error');

  errorEl.textContent = '';

  // Validate password match
  if (password !== passwordConfirm) {
    errorEl.textContent = '两次输入的密码不一致';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>注册中...</span>';

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (data.ok) {
      // Save token
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Show success
      errorEl.textContent = '✓ 注册成功！';
      errorEl.style.color = '#b8bb26';

      // Redirect
      setTimeout(() => {
        const redirect = new URLSearchParams(location.search).get('redirect') || '/';
        location.href = redirect;
      }, 500);
    } else {
      errorEl.textContent = getErrorMessage(data.error, data.message);
      btn.disabled = false;
      btn.innerHTML = '<span>注册</span>';
    }
  } catch (error) {
    errorEl.textContent = '网络错误: ' + error.message;
    btn.disabled = false;
    btn.innerHTML = '<span>注册</span>';
  }
}

function clearErrors() {
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').textContent = '';
}

function getErrorMessage(error, defaultMsg) {
  const messages = {
    'invalid_credentials': '用户名或密码错误',
    'user_inactive': '您的账号已被禁用',
    'user_exists': '用户名或邮箱已被使用',
    'invalid_username': '用户名格式不正确（3-20 个字符，仅限字母、数字和下划线）',
    'invalid_email': '邮箱格式不正确',
    'invalid_password': '密码至少需要 8 个字符',
    'registration_disabled': '注册功能已关闭',
    'missing_fields': '请填写所有必填字段'
  };

  return messages[error] || defaultMsg || '操作失败';
}
