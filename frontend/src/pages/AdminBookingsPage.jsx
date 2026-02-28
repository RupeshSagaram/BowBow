// AdminBookingsPage.jsx — View all bookings across the platform; force-cancel if needed.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';

const STATUS_COLORS = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const ALL_STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

export default function AdminBookingsPage() {
  const { fetchBookings, cancelBooking } = useAdmin();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('ALL');
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    fetchBookings()
      .then((data) => setBookings(data.bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel(bookingId) {
    setActionError(null);
    try {
      await cancelBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' } : b))
      );
    } catch (err) {
      setActionError(err.message);
    }
  }

  const filtered = filter === 'ALL'
    ? bookings
    : bookings.filter((b) => b.status === filter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="text-gray-400 hover:text-teal-600 text-sm">← Admin</Link>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <span className="ml-auto text-sm text-gray-500">{bookings.length} total</span>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              filter === s
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {actionError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Owner</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Sitter</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Pet</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Dates</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Price</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                  {b.id.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {b.owner.firstName} {b.owner.lastName}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {b.sitterProfile.user.firstName} {b.sitterProfile.user.lastName}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {b.pet.name} <span className="text-gray-400">({b.pet.species})</span>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {new Date(b.startDate).toLocaleDateString()} –{' '}
                  {new Date(b.endDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-gray-700">${b.totalPrice.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status]}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                    <button
                      onClick={() => handleCancel(b.id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
