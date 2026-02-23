// ProfilePage.jsx — User's editable profile.
//
// Two data sources:
//   Clerk (useUser):   name, email, avatar — READ-ONLY in our app.
//                      The user manages these through Clerk's account portal.
//   Our DB (useDbUser): role, bio — editable here.
//
// On Save: PATCH /api/users/me { role, bio }
//   then calls refetch() to reload the latest DB data.
//   Shows "Saved!" for 2 seconds as confirmation feedback.

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useDbUser } from '../hooks/useDbUser';

const ROLE_LABELS = {
  OWNER: 'Pet Owner',
  SITTER: 'Pet Sitter',
  BOTH: 'Both',
};

export default function ProfilePage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { dbUser, loading, refetch } = useDbUser();

  // Local form state — initialised from dbUser once it loads
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Populate form when dbUser data arrives
  useEffect(() => {
    if (dbUser) {
      setRole(dbUser.role);
      setBio(dbUser.bio || '');
    }
  }, [dbUser]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, bio }),
      });

      if (!response.ok) throw new Error('Failed to save');

      await refetch(); // reload dbUser with the latest saved values
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Your Profile</h1>

      {/* Account info — from Clerk, read-only in our app */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Account Info</h2>
        <div className="flex items-center gap-4">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="Your avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-2xl">
              {user?.firstName?.[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-800 text-lg">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-gray-500 text-sm">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Name and photo are managed through your Clerk account settings.
            </p>
          </div>
        </div>
      </div>

      {/* Editable section — role and bio from our DB */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-6">Profile Details</h2>

        {/* Role selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            I am a...
          </label>
          <div className="flex flex-col gap-2">
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <label
                key={value}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  role === value
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-teal-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                  className="accent-teal-600"
                />
                <span className="font-medium text-gray-800">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Bio textarea */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bio <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell pet owners or sitters a little about yourself..."
            rows={4}
            maxLength={500}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/500</p>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
