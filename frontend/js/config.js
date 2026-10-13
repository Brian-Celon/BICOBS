/**
 * TaurOS Frontend Environment Configuration
 * Set your deployed backend URL below (e.g. on Render, Railway, Vercel, etc.)
 *
 * Example:
 *   window.TAURUS_API_BASE_URL = "https://your-backend.onrender.com";
 *
 * If left empty (""), it defaults to:
 * - http://localhost:5000 when running locally (Live Server on port 5500, file:///, etc.)
 * - Relative paths (/api/...) when frontend and backend are hosted on the same domain (Vercel monorepo)
 */
window.TAURUS_API_BASE_URL = window.TAURUS_API_BASE_URL || localStorage.getItem("taurus_api_base_url") || "";
