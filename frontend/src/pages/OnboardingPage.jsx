// OnboardingPage.jsx — First-time role selection screen.
//
// Only shown to users where hasCompletedOnboarding === false.
// The redirect lives in DashboardPage — it redirects to /onboarding when it
// detects a user who hasn't completed onboarding yet.
//
// Three role options:
//   Pet Owner  — looking for someone to care for their pet
//   Pet Sitter — offering sitting and dog walking services
//   Both       — has pets AND wants to sit for others
//
// On Continue:
//   1. PATCH /api/users/me is called with { role, hasCompletedOnboarding: true }
//   2. On success: navigate to /dashboard
//
// The gradient background (bg-linear-to-br) visually distinguishes this from
// the main app — it feels like a welcome screen, not a regular page.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';

const ROLE_OPTIONS = [
  {
    value: 'OWNER',
    label: 'Pet Owner',
    icon: '🐾',
    description: "I'm looking for someone to care for my pet.",
  },
  {
    value: 'SITTER',
    label: 'Pet Sitter',
    icon: '🏠',
    description: 'I want to offer pet sitting and dog walking services.',
  },
  {
    value: 'BOTH',
    label: 'Both',
    icon: '⭐',
    description: 'I have pets and I also want to sit for others.',
  },
];

export default function OnboardingPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleContinue() {
    if (!selectedRole) return;

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
        body: JSON.stringify({
          role: selectedRole,
          hasCompletedOnboarding: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to save role');

      // replace: true removes /onboarding from the history stack so the back
      // button doesn't return here after the user has already onboarded
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-128px)] bg-linear-to-br from-teal-50 to-cyan-100 flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Welcome to BowBow{user?.firstName ? `, ${user.firstName}` : ''}!
        </h1>
        <p className="text-gray-500 text-center mb-8">
          How will you be using BowBow? You can change this later in your profile.
        </p>

        <div className="flex flex-col gap-4 mb-8">
          {ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedRole(option.value)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                selectedRole === option.value
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-teal-300'
              }`}
            >
              <span className="text-3xl">{option.icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{option.label}</p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={!selectedRole || saving}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
