import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminRoute from './AdminRoute';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useDbUser', () => ({
  useDbUser: vi.fn(),
}));

import { useAuth } from '@clerk/clerk-react';
import { useDbUser } from '../../hooks/useDbUser';

beforeEach(() => {
  vi.clearAllMocks();
});

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div>Admin content</div>
            </AdminRoute>
          }
        />
        <Route path="/sign-in" element={<div>Sign In Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  it('shows a spinner when Clerk is still loading', () => {
    useAuth.mockReturnValue({ isLoaded: false, isSignedIn: false });
    useDbUser.mockReturnValue({ dbUser: null, loading: false });

    renderAdminRoute();

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('shows a spinner while DB user is loading', () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useDbUser.mockReturnValue({ dbUser: null, loading: true });

    renderAdminRoute();

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('redirects to /sign-in when not signed in', () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false });
    useDbUser.mockReturnValue({ dbUser: null, loading: false });

    renderAdminRoute();

    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(screen.getByText('Sign In Page')).toBeInTheDocument();
  });

  it('redirects to / when signed in but not admin', () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useDbUser.mockReturnValue({ dbUser: { isAdmin: false }, loading: false });

    renderAdminRoute();

    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders children when signed in and isAdmin is true', () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true });
    useDbUser.mockReturnValue({ dbUser: { isAdmin: true }, loading: false });

    renderAdminRoute();

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });
});
