/**
 * Centralized configuration for the frontend application.
 * Environment variables are accessed through Vite's import.meta.env.
 */
const fallbackApi = 'http://localhost:8787/api';

const envApi = import.meta.env.VITE_API_URL || '';

// Use VITE_API_URL in production, or fallback to localhost in development.
// In Vite, `import.meta.env.MODE` is 'production' for production build.
export const API_BASE_URL = import.meta.env.MODE === 'production' ? envApi : envApi || fallbackApi;

/** True in the public demo build (vite --mode demo), which shows the demo banner. */
export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const config = {
  API_BASE_URL,
  IS_DEMO,
};

export default config;
