// AvailabilityCalendar.test.jsx — Tests for the AvailabilityCalendar component.
//
// Strategy:
//   - We do NOT simulate DayPicker date clicks (too brittle against calendar internals).
//   - Instead, we pre-seed `blockedRanges` to populate the pending-blocks list,
//     then test the list rendering, remove, and save interactions.
//
// CSS imports (react-day-picker/style.css) are silently dropped by Vitest's
// `css: false` config setting.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvailabilityCalendar from './AvailabilityCalendar';

// react-day-picker v9 uses ESM-only code with browser side-effects that hang in jsdom.
// Since these tests never click calendar days, a lightweight stub is sufficient.
vi.mock('react-day-picker', () => ({
  DayPicker: () => null,
}));

// Two sample blocked ranges used as pre-seeded prop data
const BLOCK_A = { id: 'ab-1', startDate: '2025-09-01T00:00:00.000Z', endDate: '2025-09-05T00:00:00.000Z' };
const BLOCK_B = { id: 'ab-2', startDate: '2025-10-10T00:00:00.000Z', endDate: '2025-10-14T00:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Read-only mode ─────────────────────────────────────────────────────────

describe('AvailabilityCalendar — read-only mode (default)', () => {
  it('renders without crashing when no props are provided', () => {
    render(<AvailabilityCalendar />);
    // If it renders without throwing, the test passes
    expect(document.body).toBeDefined();
  });

  it('shows "Unavailable" and "Available" in the legend', () => {
    render(<AvailabilityCalendar />);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('does not render a "Save Availability" button', () => {
    render(<AvailabilityCalendar blockedRanges={[BLOCK_A]} />);
    expect(
      screen.queryByRole('button', { name: /save availability/i })
    ).not.toBeInTheDocument();
  });

  it('does not render any "Remove" buttons even when blockedRanges are passed', () => {
    render(<AvailabilityCalendar blockedRanges={[BLOCK_A, BLOCK_B]} />);
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});

// ── Edit mode — rendering ──────────────────────────────────────────────────

describe('AvailabilityCalendar — edit mode rendering', () => {
  it('renders the instruction text', () => {
    render(<AvailabilityCalendar editMode />);
    expect(screen.getByText(/select a start and end date/i)).toBeInTheDocument();
  });

  it('renders the "Save Availability" button', () => {
    render(<AvailabilityCalendar editMode onSave={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /save availability/i })
    ).toBeInTheDocument();
  });

  it('renders pre-existing blocked periods as list items with "Remove" buttons', async () => {
    render(
      <AvailabilityCalendar
        editMode
        blockedRanges={[BLOCK_A, BLOCK_B]}
        onSave={vi.fn()}
      />
    );

    // The useEffect that syncs blockedRanges → pendingBlocks may run after render
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(2);
    });
  });

  it('shows legend with "Blocked by you" and "Active booking" labels', () => {
    render(<AvailabilityCalendar editMode />);
    expect(screen.getByText(/blocked by you/i)).toBeInTheDocument();
    expect(screen.getByText(/active booking/i)).toBeInTheDocument();
  });
});

// ── Edit mode — remove block ───────────────────────────────────────────────

describe('AvailabilityCalendar — edit mode: remove block', () => {
  it('removes a block from the list when "Remove" is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AvailabilityCalendar
        editMode
        blockedRanges={[BLOCK_A, BLOCK_B]}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(2);
    });

    // Click the first Remove button
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    // One block remains
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
    });
  });

  it('removes all blocks when each "Remove" button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AvailabilityCalendar
        editMode
        blockedRanges={[BLOCK_A]}
        onSave={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
    });

    await user.click(screen.getByRole('button', { name: /remove/i }));

    // No Remove buttons should remain
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });
  });
});

// ── Edit mode — save flow ──────────────────────────────────────────────────

describe('AvailabilityCalendar — edit mode: save flow', () => {
  it('calls onSave with the current pending blocks when "Save" is clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user   = userEvent.setup();

    render(
      <AvailabilityCalendar
        editMode
        blockedRanges={[BLOCK_A]}
        onSave={onSave}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
    });

    await user.click(screen.getByRole('button', { name: /save availability/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith([
      { startDate: BLOCK_A.startDate, endDate: BLOCK_A.endDate },
    ]);
  });

  it('calls onSave with an empty array when all blocks have been removed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user   = userEvent.setup();

    render(<AvailabilityCalendar editMode blockedRanges={[]} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /save availability/i }));

    expect(onSave).toHaveBeenCalledWith([]);
  });

  it('shows "Availability saved!" after a successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user   = userEvent.setup();

    render(<AvailabilityCalendar editMode onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /save availability/i }));

    await waitFor(() => {
      expect(screen.getByText('Availability saved!')).toBeInTheDocument();
    });
  });

  it('shows a "Failed to save" message when onSave rejects', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
    const user   = userEvent.setup();

    render(<AvailabilityCalendar editMode onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /save availability/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });
  });
});
