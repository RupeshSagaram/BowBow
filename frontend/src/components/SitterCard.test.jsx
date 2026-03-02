import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import SitterCard from './SitterCard';
import { renderWithRouter } from '../test/utils';

// Minimal sitter fixture — tests override specific fields as needed
function makeSitter(overrides = {}) {
  return {
    id: 'sitter-1',
    rate: 50,
    services: ['Boarding', 'Dog Walking', 'Day Care'],
    city: 'Austin',
    state: 'TX',
    avgRating: 4.8,
    reviewCount: 12,
    yearsExperience: 3,
    user: {
      firstName: 'Jane',
      lastName: 'Doe',
      avatarUrl: null,
      bio: 'I love dogs!',
    },
    ...overrides,
  };
}

describe('SitterCard', () => {
  it('renders the sitter full name', () => {
    renderWithRouter(<SitterCard sitter={makeSitter()} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders the rate as $X/night', () => {
    renderWithRouter(<SitterCard sitter={makeSitter({ rate: 65 })} />);
    expect(screen.getByText('$65/night')).toBeInTheDocument();
  });

  it('renders star rating and review count when avgRating is set', () => {
    renderWithRouter(<SitterCard sitter={makeSitter({ avgRating: 4.8, reviewCount: 12 })} />);
    expect(screen.getByText('★ 4.8 (12)')).toBeInTheDocument();
  });

  it('omits rating element when avgRating is null', () => {
    renderWithRouter(<SitterCard sitter={makeSitter({ avgRating: null, reviewCount: 0 })} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it('renders avatar img with correct alt text when avatarUrl is set', () => {
    renderWithRouter(
      <SitterCard sitter={makeSitter({ user: { firstName: 'Jane', lastName: 'Doe', avatarUrl: 'https://example.com/avatar.jpg', bio: null } })} />
    );
    const img = screen.getByRole('img', { name: "Jane's avatar" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders initials fallback div when avatarUrl is absent', () => {
    renderWithRouter(
      <SitterCard sitter={makeSitter({ user: { firstName: 'Jane', lastName: 'Doe', avatarUrl: null, bio: null } })} />
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // Initials fallback shows first letter of first name
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders city and state as "Austin, TX"', () => {
    renderWithRouter(<SitterCard sitter={makeSitter({ city: 'Austin', state: 'TX' })} />);
    expect(screen.getByText(/Austin, TX/)).toBeInTheDocument();
  });

  it('omits location when city and state are both absent', () => {
    renderWithRouter(<SitterCard sitter={makeSitter({ city: null, state: null })} />);
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument();
  });

  it('shows first 3 service chips only', () => {
    const sitter = makeSitter({ services: ['Boarding', 'Dog Walking', 'Day Care'] });
    renderWithRouter(<SitterCard sitter={sitter} />);
    expect(screen.getByText(/Boarding/)).toBeInTheDocument();
    expect(screen.getByText(/Dog Walking/)).toBeInTheDocument();
    expect(screen.getByText(/Day Care/)).toBeInTheDocument();
    expect(screen.queryByText(/more/)).not.toBeInTheDocument();
  });

  it('shows "+2 more" text when there are 5 services', () => {
    const sitter = makeSitter({
      services: ['Boarding', 'Dog Walking', 'Day Care', 'Drop-In Visits', 'House Sitting'],
    });
    renderWithRouter(<SitterCard sitter={sitter} />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('"View Profile" link points to /sitters/:id', () => {
    renderWithRouter(<SitterCard sitter={makeSitter({ id: 'abc123' })} />);
    const link = screen.getByRole('link', { name: 'View Profile' });
    expect(link).toHaveAttribute('href', '/sitters/abc123');
  });
});
