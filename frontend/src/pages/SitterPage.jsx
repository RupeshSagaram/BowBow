// SitterPage.jsx — Public sitter profile page at /sitters/:id
//
// This page is public — no auth required. Anyone can view a sitter's profile,
// even users who aren't logged in. That's why we fetch without an auth token.
//
// Data fetching:
//   Uses local useState + useEffect instead of a hook because this fetch
//   is specific to one page and won't be reused anywhere else.
//   GET /api/sitters/:id returns { sitterProfile } with user data included.
//
// States:
//   loading → shows spinner
//   error   → shows "Sitter not found" or generic error message
//   loaded  → shows the full profile card

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

// Maps service names to emoji icons shown on the profile
const SERVICE_ICONS = {
  'Boarding':       '🏠',
  'Day Care':       '☀️',
  'Dog Walking':    '🦮',
  'Drop-In Visits': '🔔',
  'House Sitting':  '🛋️',
};

export default function SitterPage() {
  const { id } = useParams();
  const [sitterProfile, setSitterProfile] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [notFound, setNotFound]           = useState(false);

  useEffect(() => {
    async function fetchSitter() {
      try {
        // Public endpoint — no Authorization header needed
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sitters/${id}`);

        if (response.status === 404) {
          setNotFound(true);
          return;
        }

        if (!response.ok) throw new Error('Failed to load sitter');

        const data = await response.json();
        setSitterProfile(data.sitterProfile);
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchSitter();
  }, [id]);

  // ── Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────

  if (notFound || !sitterProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Sitter not found</h1>
        <p className="text-gray-500 mb-6">
          This listing may have been removed or the link is incorrect.
        </p>
        <Link
          to="/search"
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Browse Sitters
        </Link>
      </div>
    );
  }

  const { user } = sitterProfile;
  const location = [sitterProfile.city, sitterProfile.state].filter(Boolean).join(', ');

  // ── Profile ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">

        {/* Avatar + name + badges */}
        <div className="flex items-start gap-5 mb-5">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.firstName}'s avatar`}
              className="w-20 h-20 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-3xl flex-shrink-0">
              {user.firstName?.[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-800">
              {user.firstName} {user.lastName}
            </h1>

            {/* Availability + rate badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  sitterProfile.isAvailable
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {sitterProfile.isAvailable ? 'Available' : 'Unavailable'}
              </span>
              <span className="text-sm font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
                ${sitterProfile.rate}/night
              </span>
            </div>

            {/* Location */}
            {location && (
              <p className="text-sm text-gray-500 mt-2">📍 {location}</p>
            )}

            {/* Years experience */}
            {sitterProfile.yearsExperience != null && (
              <p className="text-sm text-gray-500 mt-1">
                ⭐ {sitterProfile.yearsExperience}{' '}
                {sitterProfile.yearsExperience === 1 ? 'year' : 'years'} of experience
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600 leading-relaxed">{user.bio}</p>
          </div>
        )}
      </div>

      {/* Services card */}
      {sitterProfile.services.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Services</h2>
          <div className="flex flex-wrap gap-2">
            {sitterProfile.services.map((service) => (
              <span
                key={service}
                className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-sm font-medium px-3 py-1.5 rounded-full border border-teal-200"
              >
                <span>{SERVICE_ICONS[service] ?? '🐾'}</span>
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact placeholder */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-2">Interested?</h2>
        <p className="text-sm text-gray-500 mb-4">
          Messaging and booking will be available in a future update.
        </p>
        <button
          disabled
          className="bg-gray-200 text-gray-400 font-semibold px-6 py-2.5 rounded-xl cursor-not-allowed"
        >
          Contact Sitter (coming soon)
        </button>
      </div>

    </div>
  );
}
