export function parseRoute() {
  const hash = location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  return { path: parts[0] || 'home', params: parts.slice(1) };
}

export function navigate(path) {
  location.hash = path.startsWith('/') ? path : `/${path}`;
}

export function onRouteChange(cb) {
  window.addEventListener('hashchange', cb);
  cb();
}
