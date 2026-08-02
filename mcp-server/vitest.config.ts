import { defineConfig } from 'vitest/config';

// Local config so vitest never walks up to the webapp's vite.config.ts
// (which needs the root devDependencies, absent in the mcp CI job).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
