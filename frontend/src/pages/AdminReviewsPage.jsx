// AdminReviewsPage.jsx — View all reviews; delete inappropriate ones.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';

function Stars({ rating }) {
  return (
    <span className="text-yellow-400 tracking-tight">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

export default function AdminReviewsPage() {
  const { fetchReviews, deleteReview } = useAdmin();

  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [actionError, setActionError] = useState(null);
  const [confirmId, setConfirmId] = useState(null); // id awaiting delete confirm

  useEffect(() => {
    fetchReviews()
      .then((data) => setReviews(data.reviews))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(reviewId) {
    setActionError(null);
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setConfirmId(null);
    } catch (err) {
      setActionError(err.message);
      setConfirmId(null);
    }
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <span className="ml-auto text-sm text-gray-500">{reviews.length} total</span>
      </div>

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {actionError}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex gap-4"
          >
            {/* Avatar */}
            {r.author.avatarUrl ? (
              <img
                src={r.author.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-semibold text-sm flex-shrink-0">
                {r.author.firstName[0]}{r.author.lastName[0]}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">
                  {r.author.firstName} {r.author.lastName}
                </span>
                <span className="text-gray-400 text-xs">→</span>
                <span className="text-gray-600 text-sm">
                  {r.sitterProfile.user.firstName} {r.sitterProfile.user.lastName}
                </span>
                <Stars rating={r.rating} />
                <span className="ml-auto text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.text && (
                <p className="text-gray-600 text-sm break-words">{r.text}</p>
              )}
            </div>

            {/* Delete action */}
            <div className="flex-shrink-0 flex items-start">
              {confirmId === r.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Sure?</span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs font-semibold text-red-600 hover:text-red-800"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(r.id)}
                  className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center text-gray-400 py-12">No reviews yet.</div>
        )}
      </div>
    </div>
  );
}
