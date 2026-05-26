/**
 * Centralized configuration for the frontend application.
 * Environment variables are accessed through Vite's import.meta.env.
 */
const fallbackApi = 'http://localhost:8787/api';

const envApi = import.meta.env.VITE_API_URL || '';

// Use VITE_API_URL in production, or fallback to localhost in development.
// In Vite, `import.meta.env.MODE` is 'production' for production build.
export const API_BASE_URL = import.meta.env.MODE === 'production' ? envApi : envApi || fallbackApi;

export const config = {
  API_BASE_URL,
};

export default config;
