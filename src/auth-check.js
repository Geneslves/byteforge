(() => {
  const authToken = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user');

  if (!authToken || !user) return;

  try {
    const userData = JSON.parse(user);
    const navAuth = document.querySelector('.nav-auth');

    if (!navAuth || !userData.username) return;

    navAuth.innerHTML = `<span class="auth-icon">*</span> ${userData.username}`;
    navAuth.href = '#';
    navAuth.title = 'Logout';

    navAuth.addEventListener('click', (event) => {
      event.preventDefault();

      if (!confirm('Log out of ByteForge?')) return;

      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      location.reload();
    });
  } catch {
    localStorage.removeItem('user');
  }
})();
