/**
 * Centralized configuration for the frontend application.
 * Environment variables are accessed through Vite's import.meta.env.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

export const config = {
  API_BASE_URL,
};

export default config;
