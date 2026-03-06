import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // vitest.setup.mjs pre-populates Node.js's require.cache with the Prisma
    // mock BEFORE any controller module is loaded.  Controllers use the native
    // CJS require() which checks require.cache, so they get the mock.
    setupFiles: ['./vitest.setup.mjs'],
  },
});
