import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

// Mock useNavigate — HomePage calls it when "Find Sitters" is clicked
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  mockNavigate.mockReset();
});

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  it('renders the hero heading', () => {
    renderHomePage();
    expect(screen.getByText(/Trusted Pet Care/i)).toBeInTheDocument();
  });

  it('renders all 4 service cards', () => {
    renderHomePage();
    expect(screen.getByText('Boarding')).toBeInTheDocument();
    expect(screen.getByText('Doggy Daycare')).toBeInTheDocument();
    expect(screen.getByText('Dog Walking')).toBeInTheDocument();
    expect(screen.getByText('Drop-In Visits')).toBeInTheDocument();
  });

  it('renders all 3 stats', () => {
    renderHomePage();
    expect(screen.getByText('1,000+')).toBeInTheDocument();
    expect(screen.getByText('5,000+')).toBeInTheDocument();
    expect(screen.getByText('4.9★')).toBeInTheDocument();
  });

  it('renders all 3 How BowBow Works steps', () => {
    renderHomePage();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Relax')).toBeInTheDocument();
  });

  it('navigates to /search?city=Austin when city is typed and Find Sitters is clicked', async () => {
    const user = userEvent.setup();
    renderHomePage();

    const input = screen.getByPlaceholderText(/Enter your city or zip code/i);
    await user.type(input, 'Austin');

    await user.click(screen.getByRole('button', { name: /Find Sitters/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/search?city=Austin');
  });

  it('navigates to /search (no query param) when city input is empty', async () => {
    const user = userEvent.setup();
    renderHomePage();

    await user.click(screen.getByRole('button', { name: /Find Sitters/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });
});
