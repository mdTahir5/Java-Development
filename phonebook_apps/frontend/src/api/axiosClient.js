import axios from 'axios';

/**
 * Base URL of the deployed API.
 *
 * - Production (Netlify): VITE_API_BASE_URL is injected at build time and points
 *   at the Render web service, e.g. "https://phonebook-backend.onrender.com".
 * - Local development: the variable is normally unset, so requests stay on the
 *   current origin ("/api") and the Vite dev-server proxy in vite.config.js
 *   forwards them to http://localhost:8080.
 */
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, '');
const baseURL = normalizedBaseUrl ? `${normalizedBaseUrl}/api` : '/api';

if (import.meta.env.PROD && !normalizedBaseUrl) {
  // Fail loudly in the browser console instead of silently calling /api on the
  // static host (which would return 404 for every request).
  console.error(
    '[ContactNest] VITE_API_BASE_URL is not set for this production build. ' +
      'Set it to the deployed backend origin (for example ' +
      'https://phonebook-backend.onrender.com) in Netlify, then redeploy.'
  );
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically to every request if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('phonebook_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired or invalid, clear local auth
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        localStorage.removeItem('phonebook_token');
        localStorage.removeItem('phonebook_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
