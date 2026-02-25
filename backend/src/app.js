const express = require('express');
const cors = require('cors');
const { clerkMiddleware } = require('./middleware/auth');

const app = express();

// --- Middleware ---
// Allow requests from the frontend.
// FRONTEND_URL is set in production (Vercel URL); localhost:5173 covers local dev.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));

// Parse incoming JSON request bodies
app.use(express.json());

// clerkMiddleware() reads CLERK_SECRET_KEY from .env automatically.
// It must come AFTER cors and express.json(), but BEFORE all routes.
// It runs on every request, verifies any JWT in the Authorization header,
// and populates req.auth. Routes without requireAuth() still work — they
// just won't have req.auth if the user isn't logged in.
app.use(clerkMiddleware());

// --- Routes ---
// Health check — visit http://localhost:3001/api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BowBow backend is running!' });
});

// User routes (sync Clerk user to DB, get current user)
app.use('/api/users', require('./routes/users'));

// Pet routes (CRUD for pet profiles)
app.use('/api/pets', require('./routes/pets'));

// Sitter routes (sitter listings — create, view, browse)
app.use('/api/sitters', require('./routes/sitters'));

// Booking routes (create and manage bookings between owners and sitters)
app.use('/api/bookings', require('./routes/bookings'));

// Review routes (post-stay ratings and reviews)
app.use('/api/reviews', require('./routes/reviews'));

// Message routes (per-booking message threads between owner and sitter)
app.use('/api/messages', require('./routes/messages'));

// --- 404 handler (must be after all routes) ---
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// --- Global error handler (must be last) ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

module.exports = app;
