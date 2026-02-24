// SearchPage.jsx — Browse and filter available pet sitters.
//
// Data fetching:
//   Fetches GET /api/sitters on mount (public — no auth token needed).
//   All filtering is done client-side against the full list. This is fine for
//   the current scale; server-side filtering can be added later if needed.
//
// URL query param:
//   ?city=<value> pre-populates the city filter. This lets the HomePage hero
//   search bar pass a city through to here via navigate('/search?city=...').
//
// Filter logic:
//   city    — case-insensitive partial match against city, state, or zipCode
//   services — OR logic: sitter must offer at least one selected service
//   maxRate  — sitter's rate must be ≤ maxRate (if set)
//   All three filters combine with AND (all must pass).
//
// filteredSitters is derived from `sitters` + `filters` on every render —
// no extra state needed, no useMemo needed at this scale.

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SitterCard from '../components/SitterCard';

const SERVICES_OPTIONS = [
  'Boarding',
  'Day Care',
  'Dog Walking',
  'Drop-In Visits',
  'House Sitting',
];

const EMPTY_FILTERS = { city: '', services: [], maxRate: '' };

export default function SearchPage() {
  const [searchParams] = useSearchParams();

  const [sitters, setSitters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Initialise city from ?city= URL param so the homepage search works end-to-end
  const [filters, setFilters] = useState({
    city:     searchParams.get('city') || '',
    services: [],
    maxRate:  '',
  });

  // Fetch all available sitters once on mount (public endpoint)
  useEffect(() => {
    async function fetchSitters() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sitters`);
        if (!response.ok) throw new Error('Failed to load sitters');
        const data = await response.json();
        setSitters(data.sitters);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSitters();
  }, []);

  // ── Filter helpers ────────────────────────────────────────────────────

  function toggleService(service) {
    setFilters((prev) => {
      const already = prev.services.includes(service);
      return {
        ...prev,
        services: already
          ? prev.services.filter((s) => s !== service)
          : [...prev.services, service],
      };
    });
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const hasActiveFilters =
    filters.city.trim() !== '' ||
    filters.services.length > 0 ||
    filters.maxRate !== '';

  // ── Derived: filtered list ────────────────────────────────────────────

  let filteredSitters = sitters;

  if (filters.city.trim()) {
    const term = filters.city.toLowerCase();
    filteredSitters = filteredSitters.filter(
      (s) =>
        s.city?.toLowerCase().includes(term) ||
        s.state?.toLowerCase().includes(term) ||
        s.zipCode?.includes(term)
    );
  }

  if (filters.services.length > 0) {
    // OR: keep sitter if they offer at least one selected service
    filteredSitters = filteredSitters.filter((s) =>
      filters.services.some((service) => s.services.includes(service))
    );
  }

  if (filters.maxRate !== '') {
    const max = parseFloat(filters.maxRate);
    if (!isNaN(max)) {
      filteredSitters = filteredSitters.filter((s) => s.rate <= max);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-sm">Failed to load sitters. Please refresh the page.</p>
      </div>
    );
  }

  // ── Page ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Find a Sitter</h1>
        <p className="text-gray-500 mt-1">Browse trusted pet sitters in your area.</p>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">

        {/* Top row: city + max rate + clear */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">

          {/* City / location filter */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📍</span>
            <input
              type="text"
              value={filters.city}
              onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="City, state, or zip..."
              className="w-full border border-gray-300 rounded-xl pl-8 pr-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* Max rate filter */}
          <div className="relative sm:w-44">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">Max $</span>
            <input
              type="number"
              value={filters.maxRate}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxRate: e.target.value }))}
              placeholder="Any rate"
              min="0"
              step="1"
              className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* Clear button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="sm:w-auto text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-300 hover:border-gray-400 rounded-xl px-4 py-2.5 transition-colors whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Service chips row */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 font-medium self-center mr-1">Services:</span>
          {SERVICES_OPTIONS.map((service) => {
            const active = filters.services.includes(service);
            return (
              <button
                key={service}
                onClick={() => toggleService(service)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-600'
                }`}
              >
                {service}
              </button>
            );
          })}
        </div>

      </div>

      {/* Result count */}
      {sitters.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          {filteredSitters.length}{' '}
          {filteredSitters.length === 1 ? 'sitter' : 'sitters'} found
        </p>
      )}

      {/* ── Results ───────────────────────────────────────────────────── */}

      {/* No sitters in DB at all */}
      {sitters.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🐾</p>
          <p className="text-lg font-medium text-gray-500">No sitters have signed up yet</p>
          <p className="text-sm mt-1">Check back soon!</p>
        </div>
      )}

      {/* Sitters exist but none match filters */}
      {sitters.length > 0 && filteredSitters.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg font-medium text-gray-500">No sitters match your search</p>
          <p className="text-sm mt-1 mb-4">Try adjusting your filters.</p>
          <button
            onClick={clearFilters}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 underline underline-offset-2"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Sitter cards grid */}
      {filteredSitters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSitters.map((sitter) => (
            <SitterCard key={sitter.id} sitter={sitter} />
          ))}
        </div>
      )}

    </div>
  );
}
