import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const currentDir = import.meta.dirname || (typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)));

export default defineConfig(({ mode }) => {
  const isGitHubPages =
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.GITHUB_PAGES === 'true' ||
    process.env.BUILD_FOR_GH_PAGES === 'true';

  // Base path for GitHub Pages - auto-detects from GitHub environment or defaults to /storymontionai/
  const repoName = process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/storymontionai/';

  const rawBase = process.env.BASE_PATH || (isGitHubPages ? repoName : './');
  // Ensure base path always strictly ends with a trailing slash for GitHub Pages asset resolution
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(currentDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
