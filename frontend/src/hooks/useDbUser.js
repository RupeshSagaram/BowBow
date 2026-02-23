// useDbUser.js — Fetches the current user's record from OUR PostgreSQL database.
//
// Why separate from useUser() (Clerk)?
// useUser() from Clerk gives you Clerk-managed data: name, avatar, email.
// useDbUser() gives you our DB-managed data: role, bio, hasCompletedOnboarding.
// Both are needed on the Profile page.
//
// Returns { dbUser, loading, error, refetch }
//   dbUser  → the user record from our DB (null while loading)
//   loading → true while the fetch is in progress
//   error   → error message string if fetch failed, otherwise null
//   refetch → call this after saving changes to reload the latest data
//
// useCallback wraps the fetch function so the useEffect dependency array
// doesn't cause an infinite loop (without it, the function reference changes
// on every render, triggering the effect endlessly).

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function useDbUser() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Failed to fetch user: ${response.status}`);

      const data = await response.json();
      setDbUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { dbUser, loading, error, refetch: fetchUser };
}
