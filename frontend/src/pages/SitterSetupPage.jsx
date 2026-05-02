// SitterSetupPage.jsx — Create or edit the signed-in user's sitter listing.
//
// Protected route at /my-listing (only signed-in users can reach it).
//
// Role guard:
//   If the user's role is OWNER (not a sitter), they see a message explaining
//   they need to update their role on the Profile page. This prevents owners
//   from accidentally creating a listing.
//
// Form prefill:
//   On mount, useSitterProfile() fetches the existing listing (if any).
//   Once loaded, a useEffect populates the local form state with the saved values.
//   This is the same "populate after load" pattern used in ProfilePage.jsx.
//
// Services checkboxes:
//   Each service is toggled independently. handleServiceToggle adds/removes it
//   from the `services` array in local state.
//
// On Save:
//   Calls saveListing() from the hook. Shows a "Saved!" flash for 2 seconds.
//   After the first successful save, the listing link becomes active.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDbUser } from '../hooks/useDbUser';
import { useSitterProfile } from '../hooks/useSitterProfile';
import { useAvailability } from '../hooks/useAvailability';
import AvailabilityCalendar from '../components/AvailabilityCalendar';

const SERVICES_OPTIONS = [
  'Boarding',
  'Day Care',
  'Dog Walking',
  'Drop-In Visits',
  'House Sitting',
];

const EMPTY_FORM = {
  rate:            '',
  services:        [],
  city:            '',
  state:           '',
  zipCode:         '',
  isAvailable:     true,
  yearsExperience: '',
  upiId:           '',
};

export default function SitterSetupPage() {
  const { dbUser, loading: userLoading } = useDbUser();
  const { sitterProfile, loading: profileLoading, saveListing, addPhoto, removePhoto } = useSitterProfile();
  const { blockedRanges, bookedRanges, saveBlocks } = useAvailability(sitterProfile?.id);

  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [formError, setFormError] = useState(null);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError]         = useState(null);

  // Prefill form once the existing listing loads
  useEffect(() => {
    if (sitterProfile) {
      setForm({
        rate:            String(sitterProfile.rate),
        services:        sitterProfile.services ?? [],
        city:            sitterProfile.city            ?? '',
        state:           sitterProfile.state           ?? '',
        zipCode:         sitterProfile.zipCode         ?? '',
        isAvailable:     sitterProfile.isAvailable,
        yearsExperience: sitterProfile.yearsExperience != null
                           ? String(sitterProfile.yearsExperience)
                           : '',
        upiId:           sitterProfile.upiId ?? '',
      });
    }
  }, [sitterProfile]);

  // ── Input handlers ────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleServiceToggle(service) {
    setForm((prev) => {
      const already = prev.services.includes(service);
      return {
        ...prev,
        services: already
          ? prev.services.filter((s) => s !== service)
          : [...prev.services, service],
      };
    });
  }

  // ── Photo handlers ────────────────────────────────────────────────────

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    setPhotoError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData },
      );
      if (!cloudRes.ok) throw new Error('Cloudinary upload failed');

      const cloudData = await cloudRes.json();
      await addPhoto(cloudData.secure_url);
    } catch {
      setPhotoError('Failed to upload photo. Please try again.');
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemovePhoto(url) {
    setPhotoError(null);
    try {
      await removePhoto(url);
    } catch {
      setPhotoError('Failed to remove photo. Please try again.');
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.rate || parseFloat(form.rate) < 0) {
      setFormError('Please enter a valid nightly rate.');
      return;
    }
    if (form.services.length === 0) {
      setFormError('Please select at least one service.');
      return;
    }
    if (!form.upiId.trim()) {
      setFormError('Please enter your UPI ID so owners can pay you.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      rate:            parseFloat(form.rate),
      services:        form.services,
      city:            form.city.trim()    || null,
      state:           form.state.trim()   || null,
      zipCode:         form.zipCode.trim() || null,
      isAvailable:     form.isAvailable,
      yearsExperience: form.yearsExperience !== ''
                         ? parseInt(form.yearsExperience, 10)
                         : null,
      upiId:           form.upiId.trim() || null,
    };

    try {
      await saveListing(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────

  if (userLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Role guard ────────────────────────────────────────────────────────

  if (dbUser?.role === 'OWNER') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🚫</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          You need to be a Pet Sitter
        </h1>
        <p className="text-gray-500 mb-6">
          Your current role is <span className="font-medium text-gray-700">Pet Owner</span>.
          Update your role to Sitter or Both to create a listing.
        </p>
        <Link
          to="/profile"
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Go to Profile
        </Link>
      </div>
    );
  }

  // ── Page ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Sitter Listing</h1>
        <p className="text-gray-500 mt-1">
          {sitterProfile
            ? 'Update your public listing below.'
            : 'Set up your listing so pet owners can find you.'}
        </p>
        {/* Link to public profile once listing exists */}
        {sitterProfile && (
          <Link
            to={`/sitters/${sitterProfile.id}`}
            className="inline-block mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
          >
            View public profile →
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

        {/* Rate */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nightly Rate (INR) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
            <input
              type="number"
              name="rate"
              value={form.rate}
              onChange={handleChange}
              placeholder="500"
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-xl pl-8 pr-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
        </div>

        {/* Services */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Services Offered <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col gap-2">
            {SERVICES_OPTIONS.map((service) => (
              <label
                key={service}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  form.services.includes(service)
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-teal-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.services.includes(service)}
                  onChange={() => handleServiceToggle(service)}
                  className="accent-teal-600"
                />
                <span className="text-sm font-medium text-gray-800">{service}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="e.g. San Francisco"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="state"
              value={form.state}
              onChange={handleChange}
              placeholder="CA"
              maxLength={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400 uppercase"
            />
          </div>
        </div>

        {/* Years of experience */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Years of Experience <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            name="yearsExperience"
            value={form.yearsExperience}
            onChange={handleChange}
            placeholder="e.g. 3"
            min="0"
            step="1"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {/* UPI ID for direct payments */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            UPI ID for Payments <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="upiId"
            value={form.upiId}
            onChange={handleChange}
            placeholder="e.g. yourname@upi"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            Owners pay you directly to this UPI ID after you confirm a booking.
          </p>
        </div>

        {/* Availability toggle */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isAvailable"
              checked={form.isAvailable}
              onChange={handleChange}
              className="accent-teal-600 w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">
              Currently available for bookings
            </span>
          </label>
          <p className="text-xs text-gray-400 mt-1 ml-7">
            Uncheck this if you need a break — your listing will be hidden from search results.
          </p>
        </div>

        {formError && (
          <p className="text-red-500 text-sm mb-4">{formError}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : sitterProfile ? 'Save Changes' : 'Create Listing'}
        </button>

      </div>

      {/* Availability Calendar — only shown after listing is created */}
      {sitterProfile && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Availability Calendar</h2>
          <p className="text-sm text-gray-500 mb-4">
            Block out dates when you're not available. Owners won't be able to book those dates.
          </p>
          <AvailabilityCalendar
            blockedRanges={blockedRanges}
            bookedRanges={bookedRanges}
            editMode
            onSave={saveBlocks}
          />
        </div>
      )}

      {/* Home Photos — only shown after listing is created */}
      {sitterProfile && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Home Photos</h2>
          <p className="text-sm text-gray-500 mb-4">
            Add up to 6 photos of your home so owners can see where their dog will stay.
          </p>

          {/* Existing photos grid */}
          {(sitterProfile.homePhotos ?? []).length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {sitterProfile.homePhotos.map((url) => (
                <div key={url} className="relative group">
                  <img
                    src={url}
                    alt="Home"
                    className="w-full h-28 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => handleRemovePhoto(url)}
                    disabled={photoUploading}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button — hidden once limit is reached */}
          {(sitterProfile.homePhotos ?? []).length < 6 && (
            <label className={`inline-block cursor-pointer ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={photoUploading}
              />
              <span className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                {photoUploading ? 'Uploading…' : '+ Add Photo'}
              </span>
            </label>
          )}

          {photoError && (
            <p className="text-red-500 text-sm mt-3">{photoError}</p>
          )}
        </div>
      )}

    </div>
  );
}
