// sittersController.availability.test.js
// Unit tests for getSitterAvailability and updateMyAvailability.
// Prisma is fully mocked — no real database connection is made.
//
// Mock strategy: vitest.setup.mjs pre-populates Node.js's require.cache with
// globalThis.__mockDb before any module is loaded.  The controllers' CJS
// require('../utils/prismaClient') hits that cache entry and gets the mock.
// Tests reference the same object via `const prisma = globalThis.__mockDb`.

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getSitterAvailability, updateMyAvailability } from './sittersController';

// Reference the shared mock injected by vitest.setup.mjs
const prisma = globalThis.__mockDb;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns a minimal Express-style response mock. */
function makeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json   = vi.fn().mockReturnValue(res);
  return res;
}

const SITTER_ID = 'sp-1';

const BLOCK_1   = { id: 'ab-1', startDate: new Date('2025-06-01'), endDate: new Date('2025-06-05') };
const BOOKING_1 = { id: 'bk-1', startDate: new Date('2025-07-01'), endDate: new Date('2025-07-03'), status: 'CONFIRMED' };

beforeEach(() => {
  vi.resetAllMocks();
});

// ── getSitterAvailability ──────────────────────────────────────────────────

describe('getSitterAvailability', () => {
  it('returns 404 when sitter profile not found', async () => {
    prisma.sitterProfile.findUnique.mockResolvedValue(null);

    const req = { params: { id: SITTER_ID } };
    const res = makeRes();

    await getSitterAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Sitter not found' });
  });

  it('returns blockedRanges and bookedRanges when sitter exists', async () => {
    prisma.sitterProfile.findUnique.mockResolvedValue({ id: SITTER_ID });
    prisma.availabilityBlock.findMany.mockResolvedValue([BLOCK_1]);
    prisma.booking.findMany.mockResolvedValue([BOOKING_1]);

    const req = { params: { id: SITTER_ID } };
    const res = makeRes();

    await getSitterAvailability(req, res);

    expect(res.json).toHaveBeenCalledWith({
      blockedRanges: [BLOCK_1],
      bookedRanges:  [BOOKING_1],
    });
  });

  it('returns empty arrays when sitter has no blocks or bookings', async () => {
    prisma.sitterProfile.findUnique.mockResolvedValue({ id: SITTER_ID });
    prisma.availabilityBlock.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    const req = { params: { id: SITTER_ID } };
    const res = makeRes();

    await getSitterAvailability(req, res);

    expect(res.json).toHaveBeenCalledWith({ blockedRanges: [], bookedRanges: [] });
  });

  it('queries bookings with status PENDING or CONFIRMED only', async () => {
    prisma.sitterProfile.findUnique.mockResolvedValue({ id: SITTER_ID });
    prisma.availabilityBlock.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    const req = { params: { id: SITTER_ID } };
    const res = makeRes();

    await getSitterAvailability(req, res);

    const whereArg = prisma.booking.findMany.mock.calls[0][0].where;
    expect(whereArg.status).toEqual({ in: ['PENDING', 'CONFIRMED'] });
  });

  it('returns 500 when database throws', async () => {
    prisma.sitterProfile.findUnique.mockRejectedValue(new Error('DB error'));

    const req = { params: { id: SITTER_ID } };
    const res = makeRes();

    await getSitterAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch availability' });
  });
});

// ── updateMyAvailability ───────────────────────────────────────────────────

describe('updateMyAvailability', () => {
  const CLERK_ID = 'clerk-user-1';
  const USER     = { id: 'user-1', sitterProfile: { id: 'sp-1' } };

  const VALID_BLOCKS = [
    { startDate: '2025-09-01T00:00:00.000Z', endDate: '2025-09-07T00:00:00.000Z' },
  ];

  it('returns 404 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const req = { auth: { userId: CLERK_ID }, body: { blocks: [] } };
    const res = makeRes();

    await updateMyAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('returns 404 when user has no sitterProfile', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', sitterProfile: null });

    const req = { auth: { userId: CLERK_ID }, body: { blocks: [] } };
    const res = makeRes();

    await updateMyAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'No sitter listing found' });
  });

  it('returns 400 when blocks is not an array', async () => {
    prisma.user.findUnique.mockResolvedValue(USER);

    const req = { auth: { userId: CLERK_ID }, body: { blocks: 'not-an-array' } };
    const res = makeRes();

    await updateMyAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'blocks must be an array' });
  });

  it('returns 400 when a block has an invalid date format', async () => {
    prisma.user.findUnique.mockResolvedValue(USER);

    const req = {
      auth: { userId: CLERK_ID },
      body: { blocks: [{ startDate: 'not-a-date', endDate: '2025-09-07T00:00:00.000Z' }] },
    };
    const res = makeRes();

    await updateMyAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Each block must have valid startDate and endDate',
    });
  });

  it('returns 400 when endDate is not after startDate', async () => {
    prisma.user.findUnique.mockResolvedValue(USER);

    const req = {
      auth: { userId: CLERK_ID },
      body: { blocks: [{ startDate: '2025-09-10T00:00:00.000Z', endDate: '2025-09-05T00:00:00.000Z' }] },
    };
    const res = makeRes();

    await updateMyAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'endDate must be after startDate for each block',
    });
  });

  it('calls deleteMany before creating new blocks (replace-all)', async () => {
    prisma.user.findUnique.mockResolvedValue(USER);
    prisma.availabilityBlock.deleteMany.mockResolvedValue({});
    prisma.availabilityBlock.create.mockResolvedValue({ id: 'ab-new', ...VALID_BLOCKS[0] });

    const req = { auth: { userId: CLERK_ID }, body: { blocks: VALID_BLOCKS } };
    const res = makeRes();

    await updateMyAvailability(req, res);

    expect(prisma.availabilityBlock.deleteMany).toHaveBeenCalledWith({
      where: { sitterProfileId: USER.sitterProfile.id },
    });
    expect(prisma.availabilityBlock.create).toHaveBeenCalledTimes(1);
  });

  it('returns 200 with the created blocks', async () => {
    const created = { id: 'ab-new', startDate: VALID_BLOCKS[0].startDate, endDate: VALID_BLOCKS[0].endDate };
    prisma.user.findUnique.mockResolvedValue(USER);
    prisma.availabilityBlock.deleteMany.mockResolvedValue({});
    prisma.availabilityBlock.create.mockResolvedValue(created);

    const req = { auth: { userId: CLERK_ID }, body: { blocks: VALID_BLOCKS } };
    const res = makeRes();

    await updateMyAvailability(req, res);

    expect(res.json).toHaveBeenCalledWith({ blocks: [created] });
  });

  it('handles empty blocks array (clears all, creates none)', async () => {
    prisma.user.findUnique.mockResolvedValue(USER);
    prisma.availabilityBlock.deleteMany.mockResolvedValue({});

    const req = { auth: { userId: CLERK_ID }, body: { blocks: [] } };
    const res = makeRes();

    await updateMyAvailability(req, res);

    expect(prisma.availabilityBlock.deleteMany).toHaveBeenCalled();
    expect(prisma.availabilityBlock.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ blocks: [] });
  });

  it('returns 500 on database error', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('DB error'));

    const req = { auth: { userId: CLERK_ID }, body: { blocks: [] } };
    const res = makeRes();

    await updateMyAvailability(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update availability' });
  });
});
