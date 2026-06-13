export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);

export const getRoutePath = (urlLike = location) => urlLike.pathname.replace(/\/$/, '') || '/';

export const normalizeSearch = (value) => String(value).trim().toLowerCase();
