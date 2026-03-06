// AvailabilityCalendar.jsx — Displays a sitter's availability on a calendar.
//
// Two modes:
//   readOnly (default) — shown on the public SitterPage so owners can see
//     which dates are unavailable before booking. Disabled dates are greyed out.
//
//   editMode — shown on SitterSetupPage so sitters can manage their blocked dates.
//     Sitter selects a range → clicks "Add Block" → block appears in list below.
//     Sitter can remove blocks from the list. "Save Availability" persists changes.
//
// Props:
//   blockedRanges  — [{ id, startDate, endDate }]  — sitter's manually blocked dates
//   bookedRanges   — [{ id, startDate, endDate }]  — PENDING + CONFIRMED bookings
//   editMode       — bool (default false)
//   onSave         — async (blocks) => {}  — called with the updated list of blocks
//
// Both startDate and endDate may be ISO strings or Date objects.

import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

// Convert ISO string or Date to a Date object (strips time so dates compare correctly)
function toDate(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Convert a range record from the API into a DayPicker DateRange matcher
function toMatcher(range) {
  return { from: toDate(range.startDate), to: toDate(range.endDate) };
}

// Format a Date for display, e.g. "Mar 15, 2025"
function fmt(d) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

// Stable empty defaults avoid a re-render loop: inline `= []` creates a new
// array reference on every call, which makes the useEffect([blockedRanges])
// dependency appear to change every render and triggers an infinite update cycle.
const EMPTY = [];

export default function AvailabilityCalendar({
  blockedRanges = EMPTY,
  bookedRanges  = EMPTY,
  editMode      = false,
  onSave,
}) {
  // Local copy of blocked ranges used in edit mode (initialised from prop, kept in sync)
  const [pendingBlocks, setPendingBlocks] = useState([]);
  // Range currently being selected on the calendar
  const [selecting, setSelecting]         = useState(undefined);
  const [saving, setSaving]               = useState(false);
  const [saveMsg, setSaveMsg]             = useState('');

  // Sync pendingBlocks whenever the parent provides fresh data (e.g. after fetch)
  useEffect(() => {
    setPendingBlocks(
      blockedRanges.map((r) => ({ startDate: r.startDate, endDate: r.endDate }))
    );
  }, [blockedRanges]);

  // ── Matchers for DayPicker ─────────────────────────────────────────────

  const blockedMatchers = pendingBlocks.map(toMatcher);
  const bookedMatchers  = bookedRanges.map(toMatcher);
  const allUnavailable  = [...blockedMatchers, ...bookedMatchers];

  // In edit mode, only booked ranges + past dates block selection.
  // The sitter manages manual blocks via the list, not by clicking on them.
  const selectionDisabled = [{ before: new Date() }, ...bookedMatchers];

  // ── Edit mode handlers ─────────────────────────────────────────────────

  function handleAddBlock() {
    if (!selecting?.from || !selecting?.to) return;
    setPendingBlocks((prev) => [
      ...prev,
      {
        startDate: selecting.from.toISOString(),
        endDate:   selecting.to.toISOString(),
      },
    ]);
    setSelecting(undefined);
  }

  function handleRemoveBlock(idx) {
    setPendingBlocks((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await onSave(pendingBlocks);
      setSaveMsg('Availability saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Shared calendar styles ─────────────────────────────────────────────

  // Override DayPicker's accent colour to match BowBow's teal theme
  const calendarStyle = {
    '--rdp-accent-color':            '#0d9488',
    '--rdp-accent-color-dark':       '#0f766e',
    '--rdp-background-color':        '#f0fdfa',
    '--rdp-selected-border':         '2px solid #0d9488',
  };

  // Custom inline styles for modifier classes
  const modifiersStyles = {
    blocked: { backgroundColor: '#d1d5db', color: '#6b7280', borderRadius: '4px' },
    booked:  { backgroundColor: '#fca5a5', color: '#991b1b', borderRadius: '4px' },
  };

  // ── Edit mode render ───────────────────────────────────────────────────

  if (editMode) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-4">
          Select a start and end date on the calendar to block those dates. Booked dates
          (shown in red) cannot be blocked.
        </p>

        <div className="overflow-x-auto">
          <DayPicker
            mode="range"
            selected={selecting}
            onSelect={setSelecting}
            disabled={selectionDisabled}
            modifiers={{ blocked: blockedMatchers, booked: bookedMatchers }}
            modifiersStyles={modifiersStyles}
            numberOfMonths={2}
            style={calendarStyle}
          />
        </div>

        {/* "Add Block" button appears once the user has selected a full range */}
        {selecting?.from && selecting?.to && (
          <button
            onClick={handleAddBlock}
            className="mt-2 mb-4 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            + Block {fmt(selecting.from)} – {fmt(selecting.to)}
          </button>
        )}

        {/* List of pending blocks */}
        {pendingBlocks.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Blocked periods:</h4>
            <ul className="space-y-1">
              {pendingBlocks.map((b, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm"
                >
                  <span className="text-gray-700">
                    {fmt(b.startDate)} – {fmt(b.endDate)}
                  </span>
                  <button
                    onClick={() => handleRemoveBlock(i)}
                    className="text-red-500 hover:text-red-700 ml-4 font-medium"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-gray-300" /> Blocked by you
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-200" /> Active booking
          </span>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
          {saveMsg && (
            <span className={`text-sm ${saveMsg.includes('Failed') ? 'text-red-500' : 'text-teal-700'}`}>
              {saveMsg}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Read-only mode render ──────────────────────────────────────────────

  return (
    <div>
      <div className="overflow-x-auto">
        <DayPicker
          disabled={allUnavailable}
          modifiers={{ blocked: blockedMatchers, booked: bookedMatchers }}
          modifiersStyles={modifiersStyles}
          numberOfMonths={2}
          style={calendarStyle}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-1 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-300" /> Unavailable
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-white border border-gray-300" /> Available
        </span>
      </div>
    </div>
  );
}
