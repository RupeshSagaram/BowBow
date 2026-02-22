// DashboardPage.jsx — The user's personal dashboard. Requires authentication.
//
// This page is protected by ProtectedRoute in App.jsx, so only signed-in users reach it.
//
// useUser() gives us the Clerk user object: firstName, lastName, imageUrl, emailAddresses, etc.
// useUserSync() fires once after sign-in to save/update the user record in our database.
//   This is the glue between Clerk (authentication) and our own PostgreSQL database.
//
// This page will be expanded significantly in Feature 3 (User Profiles & Role Selection)
// and Feature 10 (Dashboards). For now it confirms auth is working.

import { useUser } from '@clerk/clerk-react';
import { useUserSync } from '../hooks/useUserSync';

export default function DashboardPage() {
  const { user } = useUser();

  // Sync the Clerk user to our database on first load after sign-in
  useUserSync();

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Welcome back, {user?.firstName}! 👋
      </h1>
      <p className="text-gray-500 mb-10">
        Your dashboard is taking shape — more features coming soon.
      </p>

      {/* User info card — confirms authentication is working */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm max-w-sm">
        <div className="flex items-center gap-4">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="Your avatar"
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">
              {user?.firstName?.[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-800">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500">
              {user?.emailAddresses[0]?.emailAddress}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
