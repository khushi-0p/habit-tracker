require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('../server/config/db');
const authRoutes = require('../server/routes/authRoutes');
const habitRoutes = require('../server/routes/habitRoutes');

const app = express();

// ── Global JSON error safety net ─────────────────────────────
// Ensures ALL errors return JSON, never HTML
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parser ───────────────────────────────────────────────
app.use(express.json());

// ── Static frontend (local dev only; Vercel routes handle this) ─
app.use(express.static(path.join(__dirname, '../public')));

// ── Health check (to verify the function is alive) ───────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Check required env vars before connecting ─────────────────
if (!process.env.MONGO_URI) {
  console.error('FATAL: MONGO_URI environment variable is not set!');
}
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set!');
}

// ── DB connection (lazy: only connect when first request comes in) ─
let dbConnected = false;
const ensureDB = async (req, res, next) => {
  if (dbConnected) return next();
  if (!process.env.MONGO_URI) {
    return res.status(500).json({
      message: 'Server misconfiguration: MONGO_URI is not set. Please add it to your Vercel environment variables.'
    });
  }
  try {
    await connectDB();
    dbConnected = true;
    next();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    return res.status(500).json({ message: 'Database connection failed. Check your MONGO_URI.' });
  }
};

// ── API Routes (with DB middleware) ──────────────────────────
app.use('/api/auth', ensureDB, authRoutes);
app.use('/api/habits', ensureDB, habitRoutes);

// ── 404 handler for /api/* ────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ── Catch-all: serve index.html for non-API routes (local dev) ─
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Global error handler (always returns JSON) ────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
