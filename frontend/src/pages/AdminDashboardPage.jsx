// AdminDashboardPage.jsx — Platform stats overview for admins.
// Shows counts for users, sitters, bookings by status, revenue, and reviews.
// Links to the four admin sub-sections.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';

const STATUS_COLORS = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { fetchStats } = useAdmin();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  const bookings = stats?.bookingsByStatus ?? {};
  const totalBookings = Object.values(bookings).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Panel</h1>
      <p className="text-gray-500 mb-8">Platform overview</p>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Users"    value={stats?.totalUsers ?? 0} />
        <StatCard label="Active Sitters" value={stats?.activeSitters ?? 0} />
        <StatCard label="Total Bookings" value={totalBookings} />
        <StatCard
          label="Total Revenue"
          value={`₹${(stats?.totalRevenue ?? 0).toFixed(2)}`}
          sub="from completed bookings"
        />
      </div>

      {/* Booking breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-10">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Bookings by Status</h2>
        <div className="flex flex-wrap gap-3">
          {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => (
            <span
              key={s}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[s]}`}
            >
              {s}: {bookings[s] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {/* Quick-nav cards */}
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Manage</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/admin/users"
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:border-teal-400 hover:shadow-md transition-all"
        >
          <p className="text-xl mb-2">👥</p>
          <p className="font-semibold text-gray-900">Users</p>
          <p className="text-sm text-gray-500 mt-1">View and ban accounts</p>
        </Link>

        <Link
          to="/admin/bookings"
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:border-teal-400 hover:shadow-md transition-all"
        >
          <p className="text-xl mb-2">📅</p>
          <p className="font-semibold text-gray-900">Bookings</p>
          <p className="text-sm text-gray-500 mt-1">View and cancel bookings</p>
        </Link>

        <Link
          to="/admin/reviews"
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:border-teal-400 hover:shadow-md transition-all"
        >
          <p className="text-xl mb-2">⭐</p>
          <p className="font-semibold text-gray-900">Reviews</p>
          <p className="text-sm text-gray-500 mt-1">Moderate and delete reviews</p>
        </Link>
      </div>
    </div>
  );
}
