// useAvailability.test.js — Tests for the useAvailability hook.
// Follows the same pattern as usePets.test.js:
//   - Clerk is mocked via vi.mock('@clerk/clerk-react')
//   - HTTP calls are intercepted with MSW

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { useAvailability } from './useAvailability';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@clerk/clerk-react';

const mockGetToken = vi.fn().mockResolvedValue('mock-token');

const SITTER_ID = 'sitter-1';

const BLOCKED_RANGES = [
  { id: 'ab-1', startDate: '2025-06-01T00:00:00.000Z', endDate: '2025-06-05T00:00:00.000Z' },
];
const BOOKED_RANGES = [
  { id: 'bk-1', startDate: '2025-07-01T00:00:00.000Z', endDate: '2025-07-03T00:00:00.000Z', status: 'CONFIRMED' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockResolvedValue('mock-token');
  useAuth.mockReturnValue({ getToken: mockGetToken });

  // Default handler — most tests use this; individual tests can override
  server.use(
    http.get('*/api/sitters/sitter-1/availability', () =>
      HttpResponse.json({ blockedRanges: BLOCKED_RANGES, bookedRanges: BOOKED_RANGES })
    )
  );
});

describe('useAvailability', () => {
  // ── Initial state ──────────────────────────────────────────────────────

  it('starts with loading: true and empty arrays', () => {
    const { result } = renderHook(() => useAvailability(SITTER_ID));

    expect(result.current.loading).toBe(true);
    expect(result.current.blockedRanges).toEqual([]);
    expect(result.current.bookedRanges).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  // ── Successful fetch ───────────────────────────────────────────────────

  it('fetches and populates blockedRanges and bookedRanges on mount', async () => {
    const { result } = renderHook(() => useAvailability(SITTER_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.blockedRanges).toHaveLength(1);
    expect(result.current.blockedRanges[0].id).toBe('ab-1');
    expect(result.current.bookedRanges).toHaveLength(1);
    expect(result.current.bookedRanges[0].id).toBe('bk-1');
    expect(result.current.error).toBeNull();
  });

  it('handles API returning empty arrays gracefully', async () => {
    server.use(
      http.get('*/api/sitters/sitter-1/availability', () =>
        HttpResponse.json({ blockedRanges: [], bookedRanges: [] })
      )
    );

    const { result } = renderHook(() => useAvailability(SITTER_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.blockedRanges).toEqual([]);
    expect(result.current.bookedRanges).toEqual([]);
  });

  // ── Error handling ─────────────────────────────────────────────────────

  it('sets error when API returns a non-ok status', async () => {
    server.use(
      http.get('*/api/sitters/sitter-1/availability', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useAvailability(SITTER_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.blockedRanges).toEqual([]);
  });

  // ── Null sitterId guard ────────────────────────────────────────────────

  it('does not fetch when sitterId is null', async () => {
    let callCount = 0;
    server.use(
      http.get('*/api/sitters/*/availability', () => {
        callCount++;
        return HttpResponse.json({ blockedRanges: [], bookedRanges: [] });
      })
    );

    renderHook(() => useAvailability(null));

    // Wait a tick — if a fetch were triggered it would complete almost immediately
    await new Promise((r) => setTimeout(r, 80));

    expect(callCount).toBe(0);
  });

  // ── saveBlocks ─────────────────────────────────────────────────────────

  it('saveBlocks PUTs to /api/sitters/me/availability and updates blockedRanges', async () => {
    const newBlocks = [
      { id: 'ab-new', startDate: '2025-10-01T00:00:00.000Z', endDate: '2025-10-05T00:00:00.000Z' },
    ];
    server.use(
      http.put('*/api/sitters/me/availability', () =>
        HttpResponse.json({ blocks: newBlocks })
      )
    );

    const { result } = renderHook(() => useAvailability(SITTER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveBlocks([
        { startDate: '2025-10-01T00:00:00.000Z', endDate: '2025-10-05T00:00:00.000Z' },
      ]);
    });

    expect(result.current.blockedRanges).toEqual(newBlocks);
  });

  it('saveBlocks sends Authorization header with token', async () => {
    let capturedHeaders;
    server.use(
      http.put('*/api/sitters/me/availability', ({ request }) => {
        capturedHeaders = request.headers.get('Authorization');
        return HttpResponse.json({ blocks: [] });
      })
    );

    const { result } = renderHook(() => useAvailability(SITTER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.saveBlocks([]); });

    expect(capturedHeaders).toBe('Bearer mock-token');
  });

  it('saveBlocks throws when API returns a non-ok status', async () => {
    server.use(
      http.put('*/api/sitters/me/availability', () =>
        HttpResponse.json({ error: 'Failed' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useAvailability(SITTER_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.saveBlocks([]);
      })
    ).rejects.toThrow('Failed to save availability');
  });
});
