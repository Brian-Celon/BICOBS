const app = require('../back-end/server');

// Vercel rewrites /api/* to /api/index.js, which hides the real path from Express.
// vercel.json forwards it as ?__path=..., so restore req.url and req.originalUrl before routing.
module.exports = (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const originalPath = url.searchParams.get('__path');
    if (originalPath) {
      url.searchParams.delete('__path');
      const query = url.searchParams.toString();
      const reconstructed = originalPath + (query ? `?${query}` : '');
      req.url = reconstructed;
      req.originalUrl = reconstructed;
    }

    // Normalize pre-parsed Vercel body
    if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {}
    }
  } catch (e) {
    // Fall back to original req.url if URL parsing fails
  }
  return app(req, res);
};
