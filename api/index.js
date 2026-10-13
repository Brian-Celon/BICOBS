const app = require('../back-end/server');

// Vercel rewrites /api/* to /api/index.js, which hides the real path from Express.
// vercel.json forwards it as ?__path=..., so restore req.url before routing.
module.exports = (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const originalPath = url.searchParams.get('__path');
  if (originalPath) {
    url.searchParams.delete('__path');
    const query = url.searchParams.toString();
    req.url = originalPath + (query ? `?${query}` : '');
  }
  return app(req, res);
};
