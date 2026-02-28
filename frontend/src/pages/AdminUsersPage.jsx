// AdminUsersPage.jsx — View all users; ban or unban accounts.
// Admins cannot ban themselves or other admins.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useAdmin } from '../hooks/useAdmin';
import { useDbUser } from '../hooks/useDbUser';

const ROLE_LABELS = { OWNER: 'Owner', SITTER: 'Sitter', BOTH: 'Owner & Sitter' };
const ROLE_COLORS = {
  OWNER:  'bg-blue-100 text-blue-700',
  SITTER: 'bg-teal-100 text-teal-700',
  BOTH:   'bg-purple-100 text-purple-700',
};

export default function AdminUsersPage() {
  const { banUser, unbanUser, fetchUsers } = useAdmin();
  const { dbUser: me } = useDbUser();

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [query, setQuery]     = useState('');
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    fetchUsers()
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBan(userId) {
    setActionError(null);
    try {
      await banUser(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: true } : u))
      );
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleUnban(userId) {
    setActionError(null);
    try {
      await unbanUser(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: false } : u))
      );
    } catch (err) {
      setActionError(err.message);
    }
  }

  const filtered = users.filter((u) => {
    const q = query.toLowerCase();
    return (
      !q ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

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
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin" className="text-gray-400 hover:text-teal-600 text-sm">← Admin</Link>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <span className="ml-auto text-sm text-gray-500">{users.length} total</span>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full mb-6 px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {actionError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-semibold text-xs">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                    )}
                    <span className="font-medium text-gray-900">
                      {u.firstName} {u.lastName}
                    </span>
                    {u.isAdmin && (
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                        Admin
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {u.isBanned ? (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                      Banned
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {/* Cannot act on yourself or other admins */}
                  {u.id !== me?.id && !u.isAdmin && (
                    u.isBanned ? (
                      <button
                        onClick={() => handleUnban(u.id)}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBan(u.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                      >
                        Ban
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
