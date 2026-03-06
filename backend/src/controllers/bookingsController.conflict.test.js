// bookingsController.conflict.test.js
// Focused unit tests for the two availability conflict checks inside createBooking:
//   1. AvailabilityBlock overlap  → 409 "Sitter is not available on those dates"
//   2. Active booking overlap     → 409 "Those dates are already booked"
//
// All other Prisma calls are mocked to pass validation cleanly so the
// tests can reach the conflict-check code.
//
// Mock strategy: vitest.setup.mjs pre-populates require.cache with globalThis.__mockDb.
// This file references that same object as `prisma`.

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createBooking } from './bookingsController';

// Reference the shared mock injected by vitest.setup.mjs
const prisma = globalThis.__mockDb;

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json   = vi.fn().mockReturnValue(res);
  return res;
}

// A request body that passes all pre-conflict-check validation
const VALID_BODY = {
  sitterProfileId: 'sp-owner-1',
  petId:           'pet-1',
  service:         'Boarding',
  startDate:       '2025-10-01',
  endDate:         '2025-10-07',
};

/**
 * Sets up all Prisma mocks so createBooking passes validation and
 * reaches the conflict-check lines. Tests override availabilityBlock.findFirst
 * and booking.findFirst individually.
 */
function setupValidMocks() {
  // Booking user (not the sitter)
  prisma.user.findUnique.mockResolvedValue({
    id:            'user-1',
    sitterProfile: null,  // the booking user is not a sitter
  });

  // Pet owned by user-1
  prisma.pet.findUnique.mockResolvedValue({ id: 'pet-1', userId: 'user-1' });

  // Sitter profile — different user, available, offers Boarding
  prisma.sitterProfile.findUnique.mockResolvedValue({
    id:          'sp-owner-1',
    userId:      'sitter-user-different',  // must differ from user-1
    isAvailable: true,
    services:    ['Boarding'],
    rate:        50,
  });

  // Default: no conflicts (tests override as needed)
  prisma.availabilityBlock.findFirst.mockResolvedValue(null);
  prisma.booking.findFirst.mockResolvedValue(null);

  // Successful booking creation (for pass-through tests)
  prisma.booking.create.mockResolvedValue({ id: 'bk-new', status: 'PENDING' });
}

const REQ_BASE = {
  auth: { userId: 'clerk-user-1' },
  body: VALID_BODY,
};

beforeEach(() => {
  vi.resetAllMocks();
  setupValidMocks();
});

// ── Availability Block Overlap Tests ───────────────────────────────────────

describe('createBooking — availability block conflict', () => {
  it('returns 409 when a block overlaps the requested dates', async () => {
    prisma.availabilityBlock.findFirst.mockResolvedValue({
      id: 'ab-1',
      startDate: new Date('2025-10-03'),
      endDate:   new Date('2025-10-10'),
    });

    const res = makeRes();
    await createBooking({ ...REQ_BASE }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Sitter is not available on those dates' });
    // Booking should never be created when blocked
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('proceeds (no 409) when a block ends before the requested start', async () => {
    // Block ends Sep 30, booking starts Oct 1 — no overlap
    prisma.availabilityBlock.findFirst.mockResolvedValue(null);

    const res = makeRes();
    await createBooking({ ...REQ_BASE }, res);

    // No 409, booking was created
    expect(res.status).not.toHaveBeenCalledWith(409);
    expect(prisma.booking.create).toHaveBeenCalled();
  });

  it('returns 409 when a block partially overlaps (starts inside, ends after)', async () => {
    // Block starts Oct 5, booking ends Oct 7 — overlaps Oct 5–7
    prisma.availabilityBlock.findFirst.mockResolvedValue({
      id: 'ab-2',
      startDate: new Date('2025-10-05'),
      endDate:   new Date('2025-10-15'),
    });

    const res = makeRes();
    await createBooking({ ...REQ_BASE }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Sitter is not available on those dates' });
  });

  it('does not check booking conflict when availability block already conflicts', async () => {
    prisma.availabilityBlock.findFirst.mockResolvedValue({ id: 'ab-1' });

    const res = makeRes();
    await createBooking({ ...REQ_BASE }, res);

    // booking.findFirst should NOT have been called — we short-circuit on block conflict
    expect(prisma.booking.findFirst).not.toHaveBeenCalled();
  });
});

// ── Active Booking Overlap Tests ───────────────────────────────────────────

describe('createBooking — active booking conflict', () => {
  it('returns 409 when a PENDING booking overlaps the requested dates', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'bk-1', status: 'PENDING',
      startDate: new Date('2025-10-03'), endDate: new Date('2025-10-10'),
    });

    const res = makeRes();
    await createBooking({ ...REQ_BASE }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Those dates are already booked' });
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('returns 409 when a CONFIRMED booking overlaps the requested dates', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      id: 'bk-2', status: 'CONFIRMED',
      startDate: new Date('2025-09-28'), endDate: new Date('2025-10-03'),
    });

    const res = makeRes();
    await createBooking({ ...REQ_BASE }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Those dates are already booked' });
  });

  it('proceeds when no active booking overlaps (no block, no booking conflict)', async () => {
    // Both mocks return null — no conflicts
    prisma.availabilityBlock.findFirst.mockResolvedValue(null);
    prisma.booking.findFirst.mockResolvedValue(null);

    const res = makeRes();
    await createBooking({ ...REQ_BASE }, res);

    expect(res.status).not.toHaveBeenCalledWith(409);
    expect(prisma.booking.create).toHaveBeenCalled();
  });

  it('only queries PENDING and CONFIRMED bookings for conflict', async () => {
    prisma.booking.findFirst.mockResolvedValue(null);

    const res = makeRes();
    await createBooking({ ...REQ_BASE }, res);

    const whereArg = prisma.booking.findFirst.mock.calls[0][0].where;
    expect(whereArg.status).toEqual({ in: ['PENDING', 'CONFIRMED'] });
  });
});
