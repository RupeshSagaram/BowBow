// main.jsx — Entry point of the React app.
//
// ClerkProvider must wrap the ENTIRE app.
// It sets up a React context that all Clerk hooks (useAuth, useUser) read from.
// It manages the user's session token automatically — you never touch JWTs directly.
//
// VITE_CLERK_PUBLISHABLE_KEY is read from frontend/.env.local
// Vite only exposes env variables to React code if they start with VITE_

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App.jsx';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// This check catches the common mistake of forgetting to create .env.local
if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in frontend/.env.local');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* afterSignOutUrl="/" — where to go after signing out (set here, not on UserButton) */}
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </StrictMode>,
);
