const express = require('express');
const cors = require('cors');

const app = express();

// --- Middleware ---
// Allow requests from the frontend (running on localhost:5173)
app.use(cors({ origin: 'http://localhost:5173' }));

// Parse incoming JSON request bodies
app.use(express.json());

// --- Routes ---
// Health check — visit http://localhost:3001/api/health to confirm the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BowBow backend is running!' });
});

// Future routes will be added here as we build each feature, e.g.:
// app.use('/api/users', require('./routes/users'));
// app.use('/api/pets', require('./routes/pets'));

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
