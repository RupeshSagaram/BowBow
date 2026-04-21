import { Link } from 'react-router-dom';
import { useBookings } from '../hooks/useBookings';
import { useDbUser } from '../hooks/useDbUser';

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function PaymentRow({ booking, counterpartyLabel }) {
  const { payment, startDate, endDate } = booking;
  const counterparty =
    counterpartyLabel === 'sitter'
      ? `${booking.sitterProfile?.user?.firstName ?? ''} ${booking.sitterProfile?.user?.lastName ?? ''}`.trim() || 'Unknown'
      : `${booking.owner?.firstName ?? ''} ${booking.owner?.lastName ?? ''}`.trim() || 'Unknown';

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateTime(payment.createdAt)}</td>
      <td className="px-4 py-3 font-semibold text-teal-700 whitespace-nowrap">₹{payment.amount}</td>
      <td className="px-4 py-3 text-gray-700">{counterparty}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {formatDate(startDate)} – {formatDate(endDate)}
      </td>
      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
        {payment.upiTransactionRef ?? '—'}
      </td>
    </tr>
  );
}

function PaymentTable({ bookings, counterpartyLabel, counterpartyHeader }) {
  const total = bookings.reduce((sum, b) => sum + (b.payment.amount ?? b.totalPrice), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-700">
          {counterpartyLabel === 'sitter' ? 'Payments Made' : 'Income Received'}
        </h2>
        <span className="text-sm text-teal-700 bg-teal-50 px-3 py-1 rounded-full font-medium">
          Total: ₹{total.toLocaleString('en-IN')} · {bookings.length} {bookings.length === 1 ? 'payment' : 'payments'}
        </span>
      </div>
      {bookings.length === 0 ? (
        <p className="text-gray-400 text-sm py-6 text-center border border-dashed border-gray-200 rounded-2xl">
          {counterpartyLabel === 'sitter'
            ? 'No payments made yet. Payments appear here once a confirmed booking is marked as paid.'
            : 'No income recorded yet. Payments will appear here once an owner pays for a confirmed booking.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date &amp; Time</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">{counterpartyHeader}</th>
                <th className="px-4 py-3 text-left font-medium">Booking Period</th>
                <th className="px-4 py-3 text-left font-medium">UPI Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {bookings.map((b) => (
                <PaymentRow key={b.id} booking={b} counterpartyLabel={counterpartyLabel} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  const { ownerBookings, sitterBookings, loading } = useBookings();
  const { dbUser, loading: userLoading } = useDbUser();

  if (loading || userLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwner = dbUser?.role === 'OWNER' || dbUser?.role === 'BOTH';
  const isSitter = dbUser?.role === 'SITTER' || dbUser?.role === 'BOTH';

  const paidOwnerBookings = (ownerBookings ?? [])
    .filter((b) => b.payment?.status === 'PAID')
    .sort((a, b) => new Date(b.payment.createdAt) - new Date(a.payment.createdAt));

  const paidSitterBookings = (sitterBookings ?? [])
    .filter((b) => b.payment?.status === 'PAID')
    .sort((a, b) => new Date(b.payment.createdAt) - new Date(a.payment.createdAt));

  const hasAnyPayments =
    (isOwner && paidOwnerBookings.length > 0) ||
    (isSitter && paidSitterBookings.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-800">Payments</h1>
      <p className="text-gray-500 mt-1 mb-10">Your payment history across all bookings.</p>

      {!hasAnyPayments ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">💳</div>
          <p className="text-lg font-medium text-gray-500 mb-2">No payment history yet</p>
          <p className="text-sm mb-6">Payments will appear here once a booking is paid.</p>
          {isOwner && (
            <Link
              to="/search"
              className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
            >
              Find a Sitter →
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {isOwner && (
            <PaymentTable
              bookings={paidOwnerBookings}
              counterpartyLabel="sitter"
              counterpartyHeader="Sitter"
            />
          )}
          {isSitter && (
            <PaymentTable
              bookings={paidSitterBookings}
              counterpartyLabel="owner"
              counterpartyHeader="Owner"
            />
          )}
        </div>
      )}
    </div>
  );
}
