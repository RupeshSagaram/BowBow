import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import SearchPage from './SearchPage';

function makeSitter(overrides = {}) {
  return {
    id: 'sitter-1',
    rate: 50,
    services: ['Boarding'],
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    avgRating: null,
    reviewCount: 0,
    yearsExperience: null,
    user: { firstName: 'Jane', lastName: 'Doe', avatarUrl: null, bio: null },
    ...overrides,
  };
}

function renderSearchPage(initialEntries = ['/search']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <SearchPage />
    </MemoryRouter>
  );
}

describe('SearchPage', () => {
  it('shows a spinner while fetching', () => {
    server.use(
      http.get('*/api/sitters', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ sitters: [] });
      })
    );

    renderSearchPage();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders sitter cards and correct count after a successful fetch', async () => {
    server.use(
      http.get('*/api/sitters', () =>
        HttpResponse.json({
          sitters: [
            makeSitter({ id: 's1' }),
            makeSitter({ id: 's2', user: { firstName: 'Bob', lastName: 'Smith', avatarUrl: null, bio: null } }),
          ],
        })
      )
    );

    renderSearchPage();

    await waitFor(() => expect(screen.queryByText(/sitters found/i)).toBeInTheDocument());
    expect(screen.getByText('2 sitters found')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View Profile' })).toHaveLength(2);
  });

  it('shows "No sitters have signed up yet" when API returns empty array', async () => {
    server.use(
      http.get('*/api/sitters', () => HttpResponse.json({ sitters: [] }))
    );

    renderSearchPage();

    await waitFor(() =>
      expect(screen.getByText('No sitters have signed up yet')).toBeInTheDocument()
    );
  });

  it('shows error message when fetch fails', async () => {
    server.use(
      http.get('*/api/sitters', () =>
        HttpResponse.json({ error: 'Server error' }, { status: 500 })
      )
    );

    renderSearchPage();

    await waitFor(() =>
      expect(screen.getByText(/Failed to load sitters/i)).toBeInTheDocument()
    );
  });

  it('pre-populates city filter from ?city=Austin URL param', async () => {
    server.use(
      http.get('*/api/sitters', () => HttpResponse.json({ sitters: [] }))
    );

    renderSearchPage(['/search?city=Austin']);

    await waitFor(() =>
      expect(screen.queryByText('No sitters have signed up yet')).toBeInTheDocument()
    );

    const cityInput = screen.getByPlaceholderText(/City, state, or zip/i);
    expect(cityInput).toHaveValue('Austin');
  });

  it('city filter narrows results by case-insensitive partial match', async () => {
    server.use(
      http.get('*/api/sitters', () =>
        HttpResponse.json({
          sitters: [
            makeSitter({ id: 's1', city: 'Austin', user: { firstName: 'Jane', lastName: 'Doe', avatarUrl: null, bio: null } }),
            makeSitter({ id: 's2', city: 'Portland', user: { firstName: 'Bob', lastName: 'Smith', avatarUrl: null, bio: null } }),
          ],
        })
      )
    );

    const user = userEvent.setup();
    renderSearchPage();

    await waitFor(() => expect(screen.getByText('2 sitters found')).toBeInTheDocument());

    const cityInput = screen.getByPlaceholderText(/City, state, or zip/i);
    await user.type(cityInput, 'austin');

    expect(screen.getByText('1 sitter found')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
  });

  it('service chip toggles and filters sitters', async () => {
    server.use(
      http.get('*/api/sitters', () =>
        HttpResponse.json({
          sitters: [
            makeSitter({ id: 's1', services: ['Boarding'], user: { firstName: 'Jane', lastName: 'Doe', avatarUrl: null, bio: null } }),
            makeSitter({ id: 's2', services: ['Dog Walking'], user: { firstName: 'Bob', lastName: 'Smith', avatarUrl: null, bio: null } }),
          ],
        })
      )
    );

    const user = userEvent.setup();
    renderSearchPage();

    await waitFor(() => expect(screen.getByText('2 sitters found')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Boarding' }));

    expect(screen.getByText('1 sitter found')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
  });
});
