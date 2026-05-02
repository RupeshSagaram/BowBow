// usersController.test.js
// Unit tests for getMe() and updateMe().
//
// Mock strategy: vitest.setup.mjs pre-populates require.cache with globalThis.__mockDb
// before any module loads. Controllers' CJS require('../utils/prismaClient') gets the mock.

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getMe, updateMe } from './usersController';

const prisma = globalThis.__mockDb;

function makeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json   = vi.fn().mockReturnValue(res);
  return res;
}

const MOCK_USER = { id: 'user-1', clerkId: 'clerk-1', role: 'OWNER', bio: 'hello' };

beforeEach(() => {
  vi.resetAllMocks();
});

// ── getMe ──────────────────────────────────────────────────────────────────

describe('getMe', () => {
  it('returns 200 with the user when found', async () => {
    prisma.user.findUnique.mockResolvedValue(MOCK_USER);

    const req = { auth: { userId: 'clerk-1' } };
    const res = makeRes();
    await getMe(req, res);

    expect(res.json).toHaveBeenCalledWith({ user: MOCK_USER });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 404 when user is not in the database', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const req = { auth: { userId: 'clerk-unknown' } };
    const res = makeRes();
    await getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found — have you synced yet?' });
  });
});

// ── updateMe ───────────────────────────────────────────────────────────────

describe('updateMe', () => {
  it('updates role and bio and returns 200 with the user', async () => {
    const updated = { ...MOCK_USER, role: 'SITTER', bio: 'new bio' };
    prisma.user.update.mockResolvedValue(updated);

    const req = { auth: { userId: 'clerk-1' }, body: { role: 'SITTER', bio: 'new bio' } };
    const res = makeRes();
    await updateMe(req, res);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { clerkId: 'clerk-1' },
      data:  { role: 'SITTER', bio: 'new bio' },
    });
    expect(res.json).toHaveBeenCalledWith({ user: updated });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('partial update: only bio sent — only bio included in updateData', async () => {
    const updated = { ...MOCK_USER, bio: 'updated only' };
    prisma.user.update.mockResolvedValue(updated);

    const req = { auth: { userId: 'clerk-1' }, body: { bio: 'updated only' } };
    const res = makeRes();
    await updateMe(req, res);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { clerkId: 'clerk-1' },
      data:  { bio: 'updated only' },
    });
    expect(res.json).toHaveBeenCalledWith({ user: updated });
  });

  it('returns 400 when request body has no recognised fields', async () => {
    const req = { auth: { userId: 'clerk-1' }, body: {} };
    const res = makeRes();
    await updateMe(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No updatable fields provided' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 when role is an empty string (invalid enum)', async () => {
    const req = { auth: { userId: 'clerk-1' }, body: { role: '' } };
    const res = makeRes();
    await updateMe(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid role value' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 when role is an unrecognised value', async () => {
    const req = { auth: { userId: 'clerk-1' }, body: { role: 'ADMIN' } };
    const res = makeRes();
    await updateMe(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid role value' });
  });

  it('returns 404 when the user record does not exist (Prisma P2025)', async () => {
    prisma.user.update.mockRejectedValue({ code: 'P2025' });

    const req = { auth: { userId: 'clerk-ghost' }, body: { bio: 'hi' } };
    const res = makeRes();
    await updateMe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('returns 500 on an unexpected database error', async () => {
    prisma.user.update.mockRejectedValue(new Error('DB connection lost'));

    const req = { auth: { userId: 'clerk-1' }, body: { bio: 'hi' } };
    const res = makeRes();
    await updateMe(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update user' });
  });
});
