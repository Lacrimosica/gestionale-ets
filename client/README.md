# Frontend ETS Gestionale

This module contains the frontend Single Page Application (SPA) for managing volunteers and assemblies of non-profit organizations (ETS).

## Stack
- React 19
- TypeScript
- Vite
- TailwindCSS (v4)
- React Router DOM v7
- TanStack React Query

## Prerequisites
- Node.js and npm

## Installation

From the `/client` folder:
```bash
npm install
```

## Available Scripts

The following commands are configured in `package.json`:

- **`npm run dev`**: Starts the local development server with Vite and enables Hot Module Replacement (HMR).
- **`npm run build`**: Compiles the project with TypeScript (`tsc -b`) and runs an optimized production build (`vite build`).
- **`npm run preview`**: Starts a local server to test the production build.
- **`npm run lint`**: Runs ESLint for code quality and style checking.

## Development Flow

The frontend makes API calls to the backend (Cloudflare Worker). For a complete local development experience, make sure you have also started the server running in the `../server` folder.
