// Catch-all Vercel function: handles every /api/* request (e.g. /api/auth/login)
// and keeps the original URL so Express can route it.
const app = require('../back-end/server');

module.exports = app;
