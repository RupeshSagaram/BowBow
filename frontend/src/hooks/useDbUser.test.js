import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { useDbUser } from './useDbUser';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@clerk/clerk-react';

const mockGetToken = vi.fn().mockResolvedValue('mock-token');

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockResolvedValue('mock-token');
});

describe('useDbUser', () => {
  it('returns loading: true and dbUser: null initially', () => {
    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: mockGetToken,
    });

    server.use(
      http.get('*/api/users/me', async () => {
        // Delay so we can observe the loading state
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json({ user: { id: '1', isAdmin: false } });
      })
    );

    const { result } = renderHook(() => useDbUser());

    expect(result.current.loading).toBe(true);
    expect(result.current.dbUser).toBeNull();
  });

  it('fetches and populates dbUser when signed in', async () => {
    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: mockGetToken,
    });

    server.use(
      http.get('*/api/users/me', () =>
        HttpResponse.json({ user: { id: '1', isAdmin: false, role: 'OWNER' } })
      )
    );

    const { result } = renderHook(() => useDbUser());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dbUser).toEqual({ id: '1', isAdmin: false, role: 'OWNER' });
    expect(result.current.error).toBeNull();
  });

  it('skips fetch when isSignedIn is false', async () => {
    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      getToken: mockGetToken,
    });

    const { result } = renderHook(() => useDbUser());

    // Give a tick for any async side effects to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.dbUser).toBeNull();
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('sets error when API returns a non-ok status', async () => {
    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: mockGetToken,
    });

    server.use(
      http.get('*/api/users/me', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    );

    const { result } = renderHook(() => useDbUser());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/500/);
    expect(result.current.dbUser).toBeNull();
  });

  it('refetch() re-triggers the fetch', async () => {
    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: mockGetToken,
    });

    let callCount = 0;
    server.use(
      http.get('*/api/users/me', () => {
        callCount++;
        return HttpResponse.json({ user: { id: '1', isAdmin: false } });
      })
    );

    const { result } = renderHook(() => useDbUser());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(callCount).toBe(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(callCount).toBe(2);
  });
});
