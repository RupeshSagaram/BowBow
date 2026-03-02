import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@clerk/clerk-react';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProtectedRoute', () => {
  it('shows a spinner when Clerk is still loading', () => {
    useAuth.mockReturnValue({ isLoaded: false, isSignedIn: false });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Secret content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    // The spinner div has animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('redirects to /sign-in when not signed in', () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Secret content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/sign-in" element={<div>Sign In Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
    expect(screen.getByText('Sign In Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Secret content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });
});
