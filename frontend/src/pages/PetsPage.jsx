// PetsPage.jsx — Manage the signed-in user's pets.
//
// UX is driven by two pieces of React state:
//   showForm   — true when the add/edit form is visible
//   editingPet — null = "Add" mode; a pet object = "Edit" mode
//
// The form is inline (not a modal) — it appears at the top of the page
// when showForm is true. Clicking a pet's Edit button opens the form
// prefilled with that pet's data.
//
// All API calls go through the usePets hook, which handles:
//   - Loading the pets list on mount
//   - Creating, updating, and deleting (with local state updates after each)
//
// Species options are a fixed frontend list — stored as plain String in the DB
// so adding new species never requires a DB migration.

import { useState } from 'react';
import { usePets } from '../hooks/usePets';

const SPECIES_OPTIONS = [
  'Dog',
  'Cat',
  'Bird',
  'Rabbit',
  'Fish',
  'Guinea Pig',
  'Hamster',
  'Other',
];

// Emoji icons for each species — shown on pet cards
const SPECIES_ICONS = {
  Dog:          '🐶',
  Cat:          '🐱',
  Bird:         '🐦',
  Rabbit:       '🐰',
  Fish:         '🐟',
  'Guinea Pig': '🐹',
  Hamster:      '🐹',
  Other:        '🐾',
};

// Initial state for the form when opening in "add" mode
const EMPTY_FORM = {
  name:    '',
  species: '',
  breed:   '',
  age:     '',
  weight:  '',
  notes:   '',
};

export default function PetsPage() {
  const { pets, loading, error, createPet, updatePet, deletePet } = usePets();

  const [showForm, setShowForm]     = useState(false);
  const [editingPet, setEditingPet] = useState(null);   // null = add mode
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState(null);

  // ── Form open/close helpers ─────────────────────────────────────────

  function openAddForm() {
    setEditingPet(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
    // Scroll to top so the form is visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEditForm(pet) {
    setEditingPet(pet);
    // Prefill form — convert null → '' so controlled inputs don't warn
    setForm({
      name:    pet.name,
      species: pet.species,
      breed:   pet.breed  ?? '',
      age:     pet.age    != null ? String(pet.age)    : '',
      weight:  pet.weight != null ? String(pet.weight) : '',
      notes:   pet.notes  ?? '',
    });
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setShowForm(false);
    setEditingPet(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  // ── Shared input change handler ─────────────────────────────────────
  // Reads e.target.name to update the matching key in form state.
  // Every input/select/textarea has a `name` prop matching the form key.

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ── Save (create or update) ─────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Pet name is required.');
      return;
    }
    if (!form.species) {
      setFormError('Please select a species.');
      return;
    }

    setSaving(true);
    setFormError(null);

    // Build the payload — empty optional number fields become null
    const payload = {
      name:    form.name.trim(),
      species: form.species,
      breed:   form.breed.trim()   || null,
      age:     form.age    !== ''  ? parseFloat(form.age)    : null,
      weight:  form.weight !== ''  ? parseFloat(form.weight) : null,
      notes:   form.notes.trim()   || null,
    };

    try {
      if (editingPet) {
        await updatePet(editingPet.id, payload);
      } else {
        await createPet(payload);
      }
      closeForm();
    } catch (err) {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────

  async function handleDelete(pet) {
    if (!window.confirm(`Delete ${pet.name}? This cannot be undone.`)) return;
    try {
      await deletePet(pet.id);
      // If we were editing this pet, close the form
      if (editingPet?.id === pet.id) closeForm();
    } catch (err) {
      alert('Failed to delete pet. Please try again.');
    }
  }

  // ── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Page ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Pets</h1>
          <p className="text-gray-500 mt-1">
            {pets.length === 0
              ? 'Add your first pet to get started.'
              : `${pets.length} pet${pets.length === 1 ? '' : 's'} registered`}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openAddForm}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            + Add Pet
          </button>
        )}
      </div>

      {/* Fetch error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
          Failed to load pets. Please refresh the page.
        </div>
      )}

      {/* ── Inline Add / Edit Form ─────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            {editingPet ? `Edit ${editingPet.name}` : 'Add a New Pet'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Buddy"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            {/* Species */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Species <span className="text-red-500">*</span>
              </label>
              <select
                name="species"
                value={form.species}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="">Select species...</option>
                {SPECIES_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Breed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Breed <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="breed"
                value={form.breed}
                onChange={handleChange}
                placeholder="e.g. Golden Retriever"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age (years) <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                placeholder="e.g. 3"
                min="0"
                step="0.5"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (lbs) <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                name="weight"
                value={form.weight}
                onChange={handleChange}
                placeholder="e.g. 45"
                min="0"
                step="0.1"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

          </div>

          {/* Notes — full width */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Care Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any special care instructions, allergies, or things a sitter should know..."
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />
          </div>

          {formError && (
            <p className="text-red-500 text-sm mb-4">{formError}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              {saving ? 'Saving...' : editingPet ? 'Save Changes' : 'Add Pet'}
            </button>
            <button
              onClick={closeForm}
              disabled={saving}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Pet Cards ───────────────────────────────────────────────────── */}
      {pets.length === 0 && !showForm ? (
        // Empty state
        <div className="text-center py-16 text-gray-400">
          <p className="text-6xl mb-4">🐾</p>
          <p className="text-lg font-medium text-gray-500">No pets yet</p>
          <p className="text-sm mt-1">Click "+ Add Pet" to add your first furry friend.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col"
            >
              {/* Species icon + name */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{SPECIES_ICONS[pet.species] ?? '🐾'}</span>
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg leading-tight">
                    {pet.name}
                  </h3>
                  <p className="text-sm text-teal-600 font-medium">{pet.species}</p>
                </div>
              </div>

              {/* Pet details — only render lines that have values */}
              <div className="text-sm text-gray-500 space-y-1 flex-1 mb-4">
                {pet.breed && (
                  <p>Breed: <span className="text-gray-700">{pet.breed}</span></p>
                )}
                {pet.age != null && (
                  <p>Age: <span className="text-gray-700">{pet.age} {pet.age === 1 ? 'yr' : 'yrs'}</span></p>
                )}
                {pet.weight != null && (
                  <p>Weight: <span className="text-gray-700">{pet.weight} lbs</span></p>
                )}
                {pet.notes && (
                  <p className="text-gray-600 italic text-xs mt-2 line-clamp-2">
                    "{pet.notes}"
                  </p>
                )}
              </div>

              {/* Edit / Delete */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => openEditForm(pet)}
                  className="flex-1 text-sm font-medium text-teal-600 border border-teal-200 hover:bg-teal-50 rounded-lg py-1.5 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(pet)}
                  className="flex-1 text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 rounded-lg py-1.5 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
