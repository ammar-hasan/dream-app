import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
