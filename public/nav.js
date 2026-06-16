// ByteForge Navigation Center - Interactive Grid Background

// ===== 粒子系统 =====
class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.canvas.width;
    this.y = Math.random() * this.canvas.height;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.size = Math.random() * 2 + 1;
    this.opacity = Math.random() * 0.5 + 0.2;

    // 随机颜色（青色、紫色、粉色）
    const colors = [
      { r: 0, g: 243, b: 255 },     // 青色
      { r: 139, g: 92, b: 246 },    // 紫色
      { r: 255, g: 0, b: 110 }      // 粉色
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // 边界检测
    if (this.x < 0 || this.x > this.canvas.width ||
        this.y < 0 || this.y > this.canvas.height) {
      this.reset();
    }
  }

  draw(ctx) {
    ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===== 网格背景动画 =====
class GridBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridSize = 40;
    this.offset = { x: 0, y: 0 };
    this.mouse = { x: null, y: null };

    // 创建粒子
    this.particles = [];
    this.particleCount = 50;
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(new Particle(canvas));
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    canvas.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // 重置粒子位置
    this.particles.forEach(p => p.reset());
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制网格线
    for (let x = 0; x < this.canvas.width; x += this.gridSize) {
      for (let y = 0; y < this.canvas.height; y += this.gridSize) {
        // 计算与鼠标的距离
        let distance = 1;
        if (this.mouse.x !== null) {
          const dx = this.mouse.x - x;
          const dy = this.mouse.y - y;
          distance = Math.sqrt(dx * dx + dy * dy);
        }

        // 根据距离调整透明度
        const maxDistance = 200;
        let opacity = 0.15;
        if (distance < maxDistance) {
          opacity = 0.15 + (1 - distance / maxDistance) * 0.4;
        }

        // 绘制交叉点
        this.ctx.fillStyle = `rgba(0, 243, 255, ${opacity})`;
        this.ctx.fillRect(x, y, 1, 1);

        // 绘制横线
        if (x + this.gridSize < this.canvas.width) {
          this.ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.5})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(x + this.gridSize, y);
          this.ctx.stroke();
        }

        // 绘制竖线
        if (y + this.gridSize < this.canvas.height) {
          this.ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.5})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(x, y + this.gridSize);
          this.ctx.stroke();
        }
      }
    }

    // 更新和绘制粒子
    this.particles.forEach(particle => {
      particle.update();
      particle.draw(this.ctx);
    });

    // 绘制粒子连线
    this.drawParticleConnections();

    requestAnimationFrame(() => this.draw());
  }

  drawParticleConnections() {
    const maxDistance = 100;

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          const opacity = (1 - distance / maxDistance) * 0.2;
          this.ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }
  }
}

// ===== 权限检测 =====
function checkPermissions() {
  const authToken = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user');

  // 检查是否登录以及是否为管理员
  let isLoggedIn = false;
  let isAdmin = false;

  if (authToken && user) {
    try {
      const userData = JSON.parse(user);
      isLoggedIn = true;
      isAdmin = userData.role === 'admin';
    } catch (error) {
      console.error('解析用户数据失败:', error);
    }
  }

  // 更新登录卡片
  const loginCard = document.querySelector('a[href="/login.html"]');
  if (loginCard && isLoggedIn) {
    loginCard.querySelector('.card-title').textContent = 'Account';
    loginCard.querySelector('.card-desc').textContent = '账号管理';
  }

  // 处理管理后台卡片
  const adminCard = document.querySelector('a[href="/admin-v2.html"]');
  if (adminCard) {
    if (!isAdmin) {
      // 非管理员：禁用卡片
      adminCard.style.opacity = '0.4';
      adminCard.style.pointerEvents = 'none';
      adminCard.style.filter = 'grayscale(1)';
      adminCard.title = '仅限管理员访问';

      // 添加锁定图标
      const cardTitle = adminCard.querySelector('.card-title');
      if (cardTitle && !cardTitle.querySelector('.lock-icon')) {
        cardTitle.innerHTML = 'Admin <span class="lock-icon">🔒</span>';
      }

      // 点击提示
      adminCard.addEventListener('click', (e) => {
        e.preventDefault();
        alert('⚠️ 访问受限\n\n此功能仅限管理员访问。\n如需管理权限，请联系系统管理员。');
      });
    } else {
      // 管理员：正常显示
      adminCard.style.opacity = '1';
      adminCard.style.pointerEvents = 'auto';
      adminCard.style.filter = 'none';
    }
  }

  // 更新系统区域标题
  const systemSection = document.querySelectorAll('.nav-section')[2];
  if (systemSection) {
    const titleEl = systemSection.querySelector('.section-title');
    if (isAdmin) {
      titleEl.innerHTML = '<span class="section-icon">▸</span>SYSTEM ADMIN <span style="color: #10b981; font-size: 12px; margin-left: 8px;">● AUTHORIZED</span>';
    }
  }

  return { isLoggedIn, isAdmin };
}

// ===== 时钟更新 =====
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const clockEl = document.getElementById('status-clock');
  if (clockEl) {
    clockEl.textContent = `${hours}:${minutes}:${seconds}`;
  }
}

// ===== 卡片入场动画 =====
function initCardAnimations() {
  const cards = document.querySelectorAll('.nav-card');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
}

// ===== 键盘快捷键 =====
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // ESC 返回主页
    if (e.key === 'Escape') {
      window.location.href = '/';
    }

    // Ctrl/Cmd + K 聚焦搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      window.location.href = '/search/';
    }
  });
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  // 初始化网格背景
  const canvas = document.getElementById('grid-canvas');
  const grid = new GridBackground(canvas);
  grid.draw();

  // 更新时钟
  updateClock();
  setInterval(updateClock, 1000);

  // 检查权限
  const { isLoggedIn, isAdmin } = checkPermissions();

  // 初始化卡片动画
  initCardAnimations();

  // 初始化键盘快捷键
  initKeyboardShortcuts();

  // 添加页面加载完成的指示
  console.log('%c[ByteForge Navigation Center]%c System initialized',
    'color: #00f3ff; font-weight: bold; font-size: 14px',
    'color: #10b981; font-size: 12px'
  );

  if (isAdmin) {
    console.log('%c[Admin Access]%c Authorized',
      'color: #ff006e; font-weight: bold; font-size: 12px',
      'color: #10b981; font-size: 12px'
    );
  }
});
