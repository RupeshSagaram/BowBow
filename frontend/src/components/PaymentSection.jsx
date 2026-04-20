// PaymentSection.jsx — Shown to the owner on CONFIRMED bookings.
// Displays a UPI deeplink button and QR code so the owner can pay the sitter directly.
// Once the owner pays, they click "I've Paid" to record the payment on the platform.

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function PaymentSection({ booking, onMarkPaid }) {
  const [utrRef,      setUtrRef]      = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);

  const sitterProfile = booking.sitterProfile;
  const sitterUser    = sitterProfile?.user;
  const upiId         = sitterProfile?.upiId;
  const amount        = booking.totalPrice;

  // UPI payment URI — works with PhonePe, Google Pay, Paytm, and all UPI apps
  const sitterName = sitterUser
    ? `${sitterUser.firstName} ${sitterUser.lastName}`
    : 'Sitter';

  const upiUri = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(sitterName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`BowBow Booking`)}`
    : null;

  // Payment already recorded
  if (booking.payment?.status === 'PAID') {
    return (
      <div className="border-t border-gray-100 pt-4 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-lg">✓</span>
          <p className="text-sm font-medium text-green-700">Payment Sent</p>
        </div>
        {booking.payment.upiTransactionRef && (
          <p className="text-xs text-gray-400 mt-1">
            UTR: {booking.payment.upiTransactionRef}
          </p>
        )}
      </div>
    );
  }

  // Sitter hasn't added UPI ID yet
  if (!upiId) {
    return (
      <div className="border-t border-gray-100 pt-4 mt-2">
        <p className="text-sm text-gray-400 italic">
          Awaiting payment details from sitter. Please message them for their UPI ID.
        </p>
      </div>
    );
  }

  async function handleMarkPaid() {
    setError(null);
    setSubmitting(true);
    try {
      await onMarkPaid(booking.id, utrRef.trim() || undefined);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-gray-100 pt-4 mt-2">
      <p className="text-sm font-semibold text-gray-700 mb-3">Pay Sitter via UPI</p>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* QR Code for desktop users */}
        <div className="flex-shrink-0">
          <QRCodeSVG value={upiUri} size={120} level="M" />
          <p className="text-xs text-gray-400 mt-1.5 text-center">Scan with any UPI app</p>
        </div>

        <div className="flex-1 min-w-0">
          {/* UPI details */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-3">
            <p className="text-xs text-gray-500 mb-0.5">Pay to</p>
            <p className="text-sm font-medium text-gray-800">{sitterName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{upiId}</p>
            <p className="text-base font-bold text-teal-700 mt-1.5">₹{amount}</p>
          </div>

          {/* Mobile deeplink button */}
          <a
            href={upiUri}
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors mb-3"
          >
            Open UPI App
          </a>

          {/* UTR reference (optional) */}
          <div className="mb-3">
            <input
              type="text"
              value={utrRef}
              onChange={(e) => setUtrRef(e.target.value)}
              placeholder="UTR / Transaction ID (optional)"
              className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

          {/* Confirm payment button */}
          <button
            onClick={handleMarkPaid}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            {submitting ? 'Recording…' : "I've Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}
