import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { useMessages } from './useMessages';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../lib/socket', () => {
  const mockSocket = {
    connected: false,
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    auth: {},
  };
  return {
    connectSocket: vi.fn(),
    disconnectSocket: vi.fn(),
    getSocket: vi.fn(() => mockSocket),
  };
});

import { useAuth } from '@clerk/clerk-react';
import { getSocket } from '../lib/socket';

const mockGetToken = vi.fn().mockResolvedValue('mock-token');

const mockMessage1 = { id: 'm1', text: 'Hello', senderId: 'u1' };
const mockMessage2 = { id: 'm2', text: 'World', senderId: 'u2' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockResolvedValue('mock-token');
  useAuth.mockReturnValue({ getToken: mockGetToken });

  // Reset socket mock state
  const socket = getSocket();
  socket.connected = false;
  socket.emit.mockReset();
  socket.on.mockReset();
  socket.off.mockReset();
});

describe('useMessages', () => {
  it('fetches message history on mount when bookingId is set', async () => {
    server.use(
      http.get('*/api/messages/booking-1', () =>
        HttpResponse.json({ messages: [mockMessage1] })
      )
    );

    const { result } = renderHook(() => useMessages('booking-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].text).toBe('Hello');
  });

  it('returns empty messages and skips fetch when bookingId is null', async () => {
    const { result } = renderHook(() => useMessages(null));

    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.loading).toBe(false);
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('deduplicates messages received via socket', async () => {
    server.use(
      http.get('*/api/messages/booking-1', () =>
        HttpResponse.json({ messages: [mockMessage1] })
      )
    );

    const { result } = renderHook(() => useMessages('booking-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Find the 'new_message' handler registered on the socket
    const socket = getSocket();
    const newMessageCall = socket.on.mock.calls.find(([event]) => event === 'new_message');
    expect(newMessageCall).toBeDefined();
    const handleNewMessage = newMessageCall[1];

    // Receive a new unique message
    act(() => handleNewMessage({ message: mockMessage2 }));
    expect(result.current.messages).toHaveLength(2);

    // Receive the same message again — should not duplicate
    act(() => handleNewMessage({ message: mockMessage2 }));
    expect(result.current.messages).toHaveLength(2);
  });

  it('sendMessage POSTs and appends the returned message', async () => {
    const sentMessage = { id: 'm3', text: 'Sent!', senderId: 'u1' };

    server.use(
      http.get('*/api/messages/booking-1', () =>
        HttpResponse.json({ messages: [] })
      ),
      http.post('*/api/messages/booking-1', () =>
        HttpResponse.json({ message: sentMessage })
      )
    );

    const { result } = renderHook(() => useMessages('booking-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.sendMessage('Sent!');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].text).toBe('Sent!');
  });

  it('emits leave_booking on unmount when socket is connected', async () => {
    server.use(
      http.get('*/api/messages/booking-1', () =>
        HttpResponse.json({ messages: [] })
      )
    );

    // Make socket appear connected so leave_booking is emitted
    const socket = getSocket();
    socket.connected = true;

    const { unmount } = renderHook(() => useMessages('booking-1'));
    await waitFor(() => expect(result => result).toBeDefined());

    unmount();

    expect(socket.emit).toHaveBeenCalledWith('leave_booking', 'booking-1');
  });
});
