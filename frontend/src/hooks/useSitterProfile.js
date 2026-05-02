// useSitterProfile.js — Manages fetching and saving the signed-in user's sitter listing.
//
// Returns { sitterProfile, loading, error, saveListing }
//
//   sitterProfile → the user's SitterProfile record (null if they haven't created one yet)
//   loading       → true while the initial fetch is in progress
//   error         → error message string if fetch failed, otherwise null
//   saveListing   → async function; calls PUT /api/sitters/me and updates local state.
//                   Throws on failure — the calling component handles the error message.
//
// fetchListing is wrapped in useCallback so the useEffect doesn't loop.
// Follows the same pattern as usePets.js and useDbUser.js.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function useSitterProfile() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [sitterProfile, setSitterProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchListing = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sitters/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Failed to fetch listing: ${response.status}`);

      const data = await response.json();
      // data.sitterProfile is null if not created yet — that's valid
      setSitterProfile(data.sitterProfile);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  // saveListing — PUT /api/sitters/me (creates or updates)
  // Updates local sitterProfile state with the returned record after success.
  async function saveListing(listingData) {
    const token = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sitters/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(listingData),
    });

    if (!response.ok) throw new Error('Failed to save listing');

    const data = await response.json();
    setSitterProfile(data.sitterProfile);
    return data.sitterProfile;
  }

  // addPhoto — POST /api/sitters/me/photos
  // Appends a Cloudinary URL to homePhotos and updates local state.
  async function addPhoto(url) {
    const token = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sitters/me/photos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) throw new Error('Failed to add photo');

    const data = await response.json();
    setSitterProfile((prev) => ({ ...prev, homePhotos: data.homePhotos }));
  }

  // removePhoto — DELETE /api/sitters/me/photos
  // Removes a photo URL from homePhotos and updates local state.
  async function removePhoto(url) {
    const token = await getToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sitters/me/photos`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) throw new Error('Failed to remove photo');

    const data = await response.json();
    setSitterProfile((prev) => ({ ...prev, homePhotos: data.homePhotos }));
  }

  return { sitterProfile, loading, error, saveListing, addPhoto, removePhoto };
}
