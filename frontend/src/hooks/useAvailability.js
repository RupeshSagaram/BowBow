// useAvailability.js — Fetches and manages a sitter's availability data.
//
// fetchAvailability(sitterId) — GET /api/sitters/:id/availability (public)
//   Returns { blockedRanges, bookedRanges } where each range has { startDate, endDate }.
//   blockedRanges: manual blocks set by the sitter
//   bookedRanges:  PENDING + CONFIRMED bookings
//
// saveBlocks(blocks) — PUT /api/sitters/me/availability (auth required)
//   Replaces all manual blocks. blocks: [{ startDate, endDate }]
//   Used by SitterSetupPage for the sitter to manage their own calendar.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function useAvailability(sitterId) {
  const { getToken } = useAuth();
  const [blockedRanges, setBlockedRanges] = useState([]);
  const [bookedRanges, setBookedRanges]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  const fetchAvailability = useCallback(async () => {
    if (!sitterId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/sitters/${sitterId}/availability`
      );
      if (!response.ok) throw new Error(`Failed to fetch availability: ${response.status}`);

      const data = await response.json();
      setBlockedRanges(data.blockedRanges || []);
      setBookedRanges(data.bookedRanges   || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sitterId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // saveBlocks — PUT /api/sitters/me/availability
  // Replaces all manual blocks and refreshes local state.
  async function saveBlocks(blocks) {
    const token = await getToken();
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/sitters/me/availability`,
      {
        method:  'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blocks }),
      }
    );

    if (!response.ok) throw new Error('Failed to save availability');

    const data = await response.json();
    setBlockedRanges(data.blocks);
    return data.blocks;
  }

  return { blockedRanges, bookedRanges, loading, error, saveBlocks, refetch: fetchAvailability };
}
