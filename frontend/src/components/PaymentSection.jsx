// PaymentSection.jsx — Shown to the owner on CONFIRMED bookings.
// Displays a QR code so the owner can pay the sitter directly via UPI.
// Owner enters optional UTR, clicks "I've Paid" — sends a chat message to the sitter.
// Sitter then confirms receipt via a "Payment Received" button on their side.

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function PaymentSection({ booking, onSendPaymentMessage }) {
  const [utrRef,      setUtrRef]      = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [error,       setError]       = useState(null);

  const sitterProfile = booking.sitterProfile;
  const sitterUser    = sitterProfile?.user;
  const upiId         = sitterProfile?.upiId;
  const amount        = booking.totalPrice;

  const sitterName = sitterUser
    ? `${sitterUser.firstName} ${sitterUser.lastName}`
    : 'Sitter';

  const upiUri = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(sitterName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`BowBow Booking`)}`
    : null;

  // Sitter has confirmed payment received
  if (booking.payment?.status === 'PAID') {
    return (
      <div className="border-t border-gray-100 pt-4 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-lg">✓</span>
          <p className="text-sm font-medium text-green-700">Payment Sent</p>
        </div>
      </div>
    );
  }

  // Sitter hasn't added UPI ID yet
  if (!upiId) {
    return (
      <div className="border-t border-gray-100 pt-4 mt-2">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Payment details not set up</p>
          <p className="text-xs text-amber-700 mt-0.5">
            {sitterName} hasn't added a UPI ID to their profile yet. Please contact them directly to arrange payment.
          </p>
        </div>
      </div>
    );
  }

  async function handleSendPaymentMessage() {
    setError(null);
    setSubmitting(true);
    try {
      await onSendPaymentMessage(booking.id, utrRef.trim() || undefined);
      setMessageSent(true);
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
        {/* QR Code */}
        <div className="shrink-0">
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

          {messageSent ? (
            <p className="text-sm text-green-700 font-medium">
              ✓ Payment notification sent to sitter
            </p>
          ) : (
            <>
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

              <button
                onClick={handleSendPaymentMessage}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
              >
                {submitting ? 'Sending…' : "I've Paid"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
