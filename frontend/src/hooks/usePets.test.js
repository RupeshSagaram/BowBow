import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { usePets } from './usePets';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@clerk/clerk-react';

const mockGetToken = vi.fn().mockResolvedValue('mock-token');

const mockPet = { id: 'pet-1', name: 'Buddy', species: 'Dog' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockResolvedValue('mock-token');
  useAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    getToken: mockGetToken,
  });
});

describe('usePets', () => {
  it('fetches and populates pets on mount', async () => {
    server.use(
      http.get('*/api/pets', () => HttpResponse.json({ pets: [mockPet] }))
    );

    const { result } = renderHook(() => usePets());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pets).toHaveLength(1);
    expect(result.current.pets[0].name).toBe('Buddy');
  });

  it('createPet POSTs and appends the new pet', async () => {
    const newPet = { id: 'pet-2', name: 'Luna', species: 'Cat' };

    server.use(
      http.get('*/api/pets', () => HttpResponse.json({ pets: [mockPet] })),
      http.post('*/api/pets', () => HttpResponse.json({ pet: newPet }))
    );

    const { result } = renderHook(() => usePets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createPet({ name: 'Luna', species: 'Cat' });
    });

    expect(result.current.pets).toHaveLength(2);
    expect(result.current.pets[1].name).toBe('Luna');
  });

  it('updatePet PATCHes and replaces the pet in state', async () => {
    const updatedPet = { id: 'pet-1', name: 'Buddy Updated', species: 'Dog' };

    server.use(
      http.get('*/api/pets', () => HttpResponse.json({ pets: [mockPet] })),
      http.patch('*/api/pets/:id', () => HttpResponse.json({ pet: updatedPet }))
    );

    const { result } = renderHook(() => usePets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updatePet('pet-1', { name: 'Buddy Updated' });
    });

    expect(result.current.pets).toHaveLength(1);
    expect(result.current.pets[0].name).toBe('Buddy Updated');
  });

  it('deletePet DELETEs and removes the pet from state', async () => {
    server.use(
      http.get('*/api/pets', () => HttpResponse.json({ pets: [mockPet] })),
      http.delete('*/api/pets/:id', () => new HttpResponse(null, { status: 200 }))
    );

    const { result } = renderHook(() => usePets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deletePet('pet-1');
    });

    expect(result.current.pets).toHaveLength(0);
  });

  it('createPet throws when API returns 400', async () => {
    server.use(
      http.get('*/api/pets', () => HttpResponse.json({ pets: [] })),
      http.post('*/api/pets', () =>
        HttpResponse.json({ error: 'Bad request' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => usePets());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.createPet({ name: '' });
      })
    ).rejects.toThrow('Failed to create pet');
  });
});
