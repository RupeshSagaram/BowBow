// useUserSync.js — Syncs the Clerk user to our PostgreSQL database after sign-in.
//
// Why is this needed?
// Clerk manages authentication (login, sessions, passwords) in THEIR system.
// We need our OWN user record in our database so future features (pets, bookings,
// reviews) can store data linked to that user.
//
// What this hook does:
// 1. Waits until Clerk has loaded and the user is signed in
// 2. Calls POST /api/users/sync on our backend with the user's info
// 3. The backend verifies the JWT and upserts the user record in Neon PostgreSQL
//
// getToken() — fetches the user's current JWT from Clerk's session.
//   We send it as "Authorization: Bearer <token>" so the backend can verify it.
//   Clerk refreshes this token automatically — you never manage it yourself.
//
// useRef(hasSynced) — tracks whether we've already synced in this session.
//   Without this, the sync would fire on every re-render of DashboardPage.

import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

export function useUserSync() {
  const { isSignedIn, getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const hasSynced = useRef(false);

  useEffect(() => {
    // Only run when Clerk is ready, user is signed in, and we haven't synced yet
    if (!isLoaded || !isSignedIn || !user || hasSynced.current) return;

    async function syncUser() {
      try {
        const token = await getToken();

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.imageUrl,
          }),
        });

        if (!response.ok) {
          throw new Error(`Sync failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('✓ User synced to database:', data.user);
        hasSynced.current = true;
      } catch (error) {
        // Not throwing — a sync failure shouldn't break the whole app.
        // The user can still navigate the site; we'll retry on next sign-in.
        console.error('User sync failed:', error);
      }
    }

    syncUser();
  }, [isLoaded, isSignedIn, user, getToken]);
}
