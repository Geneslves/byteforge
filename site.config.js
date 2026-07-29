const DEFAULT_SITE_URL = 'https://www.thebyte.tech';

const normalizeSiteUrl = (value) => {
  const url = new URL(value || DEFAULT_SITE_URL);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`SITE_URL must use http or https: ${value}`);
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`SITE_URL must be an origin without a path, query, or hash: ${value}`);
  }

  return url.origin;
};

export const SITE_URL = normalizeSiteUrl(process.env.SITE_URL);
export const siteUrl = (path = '/') => new URL(path, `${SITE_URL}/`).href;
