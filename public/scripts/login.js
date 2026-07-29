// ByteForge Auth V2 - Futuristic Authentication System

// ===== 粒子系统 =====
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 80;
    this.connectionDistance = 150;
    this.mouse = { x: null, y: null, radius: 200 };

    this.resize();
    this.init();

    window.addEventListener('resize', () => this.resize());

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.x;
      this.mouse.y = e.y;
    });

    canvas.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        color: this.getRandomColor()
      });
    }
  }

  getRandomColor() {
    const colors = [
      'rgba(0, 243, 255, 0.8)',    // cyan
      'rgba(139, 92, 246, 0.8)',   // purple
      'rgba(255, 0, 110, 0.8)',    // pink
      'rgba(16, 185, 129, 0.8)'    // green
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 更新和绘制粒子
    this.particles.forEach((p, i) => {
      // 更新位置
      p.x += p.vx;
      p.y += p.vy;

      // 边界反弹
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

      // 鼠标交互
      if (this.mouse.x !== null) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.mouse.radius) {
          const force = (this.mouse.radius - distance) / this.mouse.radius;
          const angle = Math.atan2(dy, dx);
          p.vx -= Math.cos(angle) * force * 0.2;
          p.vy -= Math.sin(angle) * force * 0.2;
        }
      }

      // 绘制粒子
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();

      // 绘制连接线
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.connectionDistance) {
          const opacity = (1 - distance / this.connectionDistance) * 0.3;
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(0, 243, 255, ${opacity})`;
          this.ctx.lineWidth = 1;
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    });

    requestAnimationFrame(() => this.animate());
  }
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  // 初始化粒子系统
  const canvas = document.getElementById('particle-canvas');
  const particleSystem = new ParticleSystem(canvas);
  particleSystem.animate();

  // 初始化统计数据动画
  animateStats();

  // 初始化表单
  initForms();

  // 初始化切换
  initToggle();

  // 初始化密码可见性切换
  initPasswordToggle();

  // 检查注册状态
  checkRegistrationStatus();
});

// ===== 统计数据动画 =====
function animateStats() {
  const stats = {
    users: { element: document.getElementById('stat-users'), target: 1247, current: 0, digits: 4 },
    sessions: { element: document.getElementById('stat-sessions'), target: 89, current: 0, digits: 3 },
    uptime: { element: document.getElementById('stat-uptime'), target: 99.9, current: 0, isPercent: true }
  };

  function updateStat(stat) {
    if (stat.current < stat.target) {
      if (stat.isPercent) {
        // 百分比动画
        stat.current += (stat.target - stat.current) / 15;
        if (stat.current >= stat.target - 0.1) {
          stat.current = stat.target;
        }
        stat.element.textContent = stat.current.toFixed(1) + '%';
      } else {
        // 整数动画
        stat.current += Math.ceil((stat.target - stat.current) / 20);
        stat.element.textContent = stat.current.toString().padStart(stat.digits, '0');
      }
      setTimeout(() => updateStat(stat), 50);
    } else {
      if (stat.isPercent) {
        stat.element.textContent = stat.target.toFixed(1) + '%';
      } else {
        stat.element.textContent = stat.target.toString().padStart(stat.digits, '0');
      }
    }
  }

  setTimeout(() => {
    updateStat(stats.users);
    updateStat(stats.sessions);
    updateStat(stats.uptime);
  }, 500);
}

// ===== 表单初始化 =====
function initForms() {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
}

// ===== 表单切换 =====
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
  document.getElementById('login-container').classList.add('active');
  document.getElementById('register-container').classList.remove('active');
  document.getElementById('registration-disabled').classList.remove('active');
  clearErrors();
}

async function showRegisterForm() {
  // 检查注册是否启用
  try {
    const testRes = await fetch('/api/auth/registration-status');
    const testData = await testRes.json();

    if (testData.enabled === false) {
      document.getElementById('login-container').classList.remove('active');
      document.getElementById('register-container').classList.remove('active');
      document.getElementById('registration-disabled').classList.add('active');
      return;
    }
  } catch (error) {
    // 继续显示注册表单
  }

  document.getElementById('login-container').classList.remove('active');
  document.getElementById('register-container').classList.add('active');
  document.getElementById('registration-disabled').classList.remove('active');
  clearErrors();
}

// ===== 密码可见性切换 =====
function initPasswordToggle() {
  const toggleButtons = document.querySelectorAll('.toggle-password');

  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = button.querySelector('.eye-icon');

      if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '👁️';
      } else {
        input.type = 'password';
        icon.textContent = '👁';
      }
    });
  });
}

// ===== 检查注册状态 =====
async function checkRegistrationStatus() {
  try {
    await fetch('/api/health/live');
  } catch (error) {
    // 静默失败
  }
}

// ===== 登录处理 =====
async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const btnText = btn.querySelector('.btn-text span:last-child');
  const btnIcon = btn.querySelector('.btn-icon');
  const errorEl = document.getElementById('login-error');

  errorEl.textContent = '';
  btn.disabled = true;
  btnText.textContent = '验证中...';
  btnIcon.textContent = '◆';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.ok) {
      // 保存令牌
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // 显示成功
      errorEl.textContent = '✓ 登录成功！正在跳转...';
      errorEl.style.background = 'rgba(16, 185, 129, 0.1)';
      errorEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      errorEl.style.color = '#10b981';
      btnText.textContent = '成功';
      btnIcon.textContent = '✓';

      // 重定向
      setTimeout(() => {
        const redirect = new URLSearchParams(location.search).get('redirect') || '/';
        location.href = redirect;
      }, 800);
    } else {
      errorEl.textContent = getErrorMessage(data.error, data.message);
      btn.disabled = false;
      btnText.textContent = '登录';
      btnIcon.textContent = '◆';
    }
  } catch (error) {
    errorEl.textContent = '❌ 网络错误: ' + error.message;
    btn.disabled = false;
    btnText.textContent = '登录';
    btnIcon.textContent = '◆';
  }
}

// ===== 注册处理 =====
async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;
  const btn = document.getElementById('register-btn');
  const btnText = btn.querySelector('.btn-text span:last-child');
  const btnIcon = btn.querySelector('.btn-icon');
  const errorEl = document.getElementById('register-error');

  errorEl.textContent = '';

  // 验证密码匹配
  if (password !== passwordConfirm) {
    errorEl.textContent = '❌ 两次输入的密码不一致';
    return;
  }

  btn.disabled = true;
  btnText.textContent = '创建中...';
  btnIcon.textContent = '◆';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (data.ok) {
      // 保存令牌
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // 显示成功
      errorEl.textContent = '✓ 注册成功！正在跳转...';
      errorEl.style.background = 'rgba(16, 185, 129, 0.1)';
      errorEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      errorEl.style.color = '#10b981';
      btnText.textContent = '成功';
      btnIcon.textContent = '✓';

      // 重定向
      setTimeout(() => {
        const redirect = new URLSearchParams(location.search).get('redirect') || '/';
        location.href = redirect;
      }, 800);
    } else {
      errorEl.textContent = getErrorMessage(data.error, data.message);
      btn.disabled = false;
      btnText.textContent = '创建账号';
      btnIcon.textContent = '◆';
    }
  } catch (error) {
    errorEl.textContent = '❌ 网络错误: ' + error.message;
    btn.disabled = false;
    btnText.textContent = '创建账号';
    btnIcon.textContent = '◆';
  }
}

// ===== 清除错误 =====
function clearErrors() {
  const errors = document.querySelectorAll('.form-error');
  errors.forEach(el => {
    el.textContent = '';
    el.style.background = '';
    el.style.borderColor = '';
    el.style.color = '';
  });
}

// ===== 错误消息映射 =====
function getErrorMessage(error, defaultMsg) {
  const messages = {
    'invalid_credentials': '❌ 用户名或密码错误',
    'user_inactive': '❌ 您的账号已被禁用',
    'user_exists': '❌ 用户名或邮箱已被使用',
    'invalid_username': '❌ 用户名格式不正确（3-20 个字符，仅限字母、数字和下划线）',
    'invalid_email': '❌ 邮箱格式不正确',
    'invalid_password': '❌ 密码至少需要 12 个字符',
    'registration_disabled': '❌ 注册功能已关闭',
    'missing_fields': '❌ 请填写所有必填字段'
  };

  return messages[error] || ('❌ ' + (defaultMsg || '操作失败'));
}
