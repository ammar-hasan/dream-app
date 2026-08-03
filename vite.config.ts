import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * In-house PWA build step (no vite-plugin-pwa): after the bundle is written,
 * inject the precache manifest and a content-hashed cache name into the
 * copied public/sw.js, so every build ships a service worker whose cache is
 * invalidated exactly when its assets change.
 */
function dreamServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'dream-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const precache = ['index.html', 'manifest.webmanifest', 'favicon.svg'];
      const walk = (dir: string) => {
        for (const entry of readdirSync(join(outDir, dir), { withFileTypes: true })) {
          const rel = `${dir}/${entry.name}`;
          if (entry.isDirectory()) walk(rel);
          else precache.push(rel);
        }
      };
      walk('assets');
      walk('icons');
      const hash = createHash('sha256');
      for (const file of precache) hash.update(file).update(readFileSync(join(outDir, file)));
      const swPath = join(outDir, 'sw.js');
      writeFileSync(
        swPath,
        readFileSync(swPath, 'utf8')
          .replace("'__DREAM_PRECACHE__'", JSON.stringify(precache))
          .replace('__DREAM_CACHE_NAME__', `dream-shell-${hash.digest('hex').slice(0, 12)}`),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), dreamServiceWorker()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/\/src\/ui\/i18n\/(?:ar|fa|zh|pt|ru)\.ts$/.test(id)) {
            return 'locales';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright owns e2e/, mcp-server has its own runner — vitest must see neither.
    exclude: [...configDefaults.exclude, 'e2e/**', 'mcp-server/**'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
