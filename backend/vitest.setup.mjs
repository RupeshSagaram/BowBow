// vitest.setup.mjs — runs before every test file in the backend suite.
//
// Why require.cache injection?
// The controllers are CJS modules that capture `const prisma = require('../utils/prismaClient')`
// at module-load time.  Vitest's vi.mock() registry intercepts ESM `import` statements but
// does NOT intercept native CJS require() calls that originate inside CJS modules.
// Pre-populating Node.js's require.cache with the mock object ensures the controller's
// require() call returns the mock instead of creating a real PrismaClient.

import { vi } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Shared mock DB — vi.fn() instances are tracked by Vitest and are reset by
// vi.resetAllMocks() / vi.clearAllMocks() inside each test's beforeEach.
globalThis.__mockDb = {
  sitterProfile:     { findUnique: vi.fn(), upsert: vi.fn() },
  availabilityBlock: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
  booking:           { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  user:              { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  pet:               { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
};

// Inject into Node.js's shared require.cache so that any CJS require() for
// prismaClient.js — from any controller in this worker — gets the mock.
const cjsRequire = createRequire(import.meta.url);
const prismaClientPath = resolve(__dirname, 'src/utils/prismaClient.js');

cjsRequire.cache[prismaClientPath] = {
  id:       prismaClientPath,
  filename: prismaClientPath,
  loaded:   true,
  exports:  globalThis.__mockDb,
  children: [],
  paths:    [],
};
