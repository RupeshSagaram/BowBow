// SitterCard.jsx — Compact sitter listing card for the search results grid.
//
// Receives a `sitter` prop: a SitterProfile object with `user` nested inside.
// Clicking "View Profile" navigates to the public sitter page at /sitters/:id.
//
// Services: shows the first 3 as chips; if there are more, appends "+N more" text
// so the card height stays consistent across the grid.

import { Link } from 'react-router-dom';

const SERVICE_ICONS = {
  'Boarding':       '🏠',
  'Day Care':       '☀️',
  'Dog Walking':    '🦮',
  'Drop-In Visits': '🔔',
  'House Sitting':  '🛋️',
};

export default function SitterCard({ sitter }) {
  const { user } = sitter;
  const location = [sitter.city, sitter.state].filter(Boolean).join(', ');

  // Show first 3 services as chips, summarise the rest
  const visibleServices = sitter.services.slice(0, 3);
  const hiddenCount     = sitter.services.length - visibleServices.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col">

      {/* Avatar + name */}
      <div className="flex items-center gap-3 mb-3">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={`${user.firstName}'s avatar`}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg flex-shrink-0">
            {user.firstName?.[0]}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 leading-tight">
            {user.firstName} {user.lastName}
          </p>
          {/* Rate + rating + location */}
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              ${sitter.rate}/night
            </span>
            {sitter.avgRating != null && (
              <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                ★ {sitter.avgRating} ({sitter.reviewCount})
              </span>
            )}
            {location && (
              <span className="text-xs text-gray-500">📍 {location}</span>
            )}
          </div>
        </div>
      </div>

      {/* Years experience */}
      {sitter.yearsExperience != null && (
        <p className="text-xs text-gray-500 mb-2">
          ⭐ {sitter.yearsExperience}{' '}
          {sitter.yearsExperience === 1 ? 'year' : 'years'} of experience
        </p>
      )}

      {/* Bio snippet */}
      {user.bio && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
          {user.bio}
        </p>
      )}

      {/* Services chips */}
      {sitter.services.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {visibleServices.map((service) => (
            <span
              key={service}
              className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-2 py-1 rounded-full border border-teal-200"
            >
              {SERVICE_ICONS[service] ?? '🐾'} {service}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span className="text-xs text-gray-400 self-center">+{hiddenCount} more</span>
          )}
        </div>
      )}

      {/* View profile button */}
      <Link
        to={`/sitters/${sitter.id}`}
        className="mt-auto block text-center text-sm font-semibold text-teal-600 border border-teal-200 hover:bg-teal-50 rounded-xl py-2 transition-colors"
      >
        View Profile
      </Link>

    </div>
  );
}
