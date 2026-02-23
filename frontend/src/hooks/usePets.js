// usePets.js — Manages fetching and mutating pets from our API.
//
// Returns { pets, loading, error, createPet, updatePet, deletePet, refetch }
//
// fetchPets is wrapped in useCallback so the useEffect that calls it doesn't
// loop infinitely (the function reference would change on every render without it).
//
// Mutation functions (create, update, delete) update local `pets` state directly
// after a successful API call — no full refetch needed. This keeps the UI snappy.
//
// All functions throw on failure — callers (PetsPage) are responsible for
// catching errors and showing appropriate messages to the user.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function usePets() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // fetchPets — loads all pets for the signed-in user from the backend
  const fetchPets = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pets`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Failed to fetch pets: ${response.status}`);

      const data = await response.json();
      setPets(data.pets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  // Run fetchPets on mount and when auth state changes
  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  // createPet — POST a new pet, append it to the local pets list
  async function createPet(petData) {
    const token = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(petData),
    });

    if (!response.ok) throw new Error('Failed to create pet');

    const data = await response.json();
    // Append to end — matches the backend's "order by createdAt asc" sort
    setPets((prev) => [...prev, data.pet]);
    return data.pet;
  }

  // updatePet — PATCH a pet, replace it in the local list
  async function updatePet(id, petData) {
    const token = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(petData),
    });

    if (!response.ok) throw new Error('Failed to update pet');

    const data = await response.json();
    // Replace the old pet with the updated one (keep array position the same)
    setPets((prev) => prev.map((p) => (p.id === id ? data.pet : p)));
    return data.pet;
  }

  // deletePet — DELETE a pet, remove it from the local list
  async function deletePet(id) {
    const token = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to delete pet');

    // Filter out the deleted pet from local state
    setPets((prev) => prev.filter((p) => p.id !== id));
  }

  return { pets, loading, error, createPet, updatePet, deletePet, refetch: fetchPets };
}
