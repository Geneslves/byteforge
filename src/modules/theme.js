const THEME_KEY = 'byteforge:theme';

const themes = {
  dark: { icon: '🌙' },
  light: { icon: '☀️' },
};

const createThemeRipple = (event) => {
  const ripple = document.createElement('div');
  ripple.className = 'theme-ripple';
  ripple.style.left = `${event.clientX}px`;
  ripple.style.top = `${event.clientY}px`;
  ripple.style.width = '20px';
  ripple.style.height = '20px';
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 800);
};

export const initTheme = (hub) => {
  const themeToggle = hub.querySelector('.theme-toggle');
  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  const presetTheme = document.documentElement.getAttribute('data-theme-init');

  if (presetTheme) document.documentElement.removeAttribute('data-theme-init');
  hub.dataset.theme = savedTheme;

  const updateThemeIcon = (theme) => {
    const icon = themeToggle?.querySelector('.theme-icon');
    if (icon) icon.textContent = themes[theme]?.icon || themes.dark.icon;
  };

  updateThemeIcon(savedTheme);

  themeToggle?.addEventListener('click', (event) => {
    const current = hub.dataset.theme || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';

    hub.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    createThemeRipple(event);

    hub.classList.add('theme-switching');
    setTimeout(() => hub.classList.remove('theme-switching'), 400);
    updateThemeIcon(next);
  });
};
