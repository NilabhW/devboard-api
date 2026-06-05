const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables FIRST — before anything else reads them
dotenv.config();

const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const errorHandler = require('./middleware/error.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');

/**
 * Express App Setup
 * ═════════════════════════════════════════════════════
 */
const app = express();

// ─── Security Middleware ───────────────────────────────
// Helmet sets various HTTP headers to protect against common attacks
// (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet());

// CORS — allow cross-origin requests (configure for your frontend domain in production)
app.use(cors());

// ─── Body Parsers ──────────────────────────────────────
// Parse JSON request bodies (e.g. { "email": "...", "password": "..." })
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// Parse cookies (will be used for httpOnly refresh tokens later)
app.use(cookieParser());

// ─── Logging ───────────────────────────────────────────
// Morgan logs every HTTP request — 'dev' format is concise and colorful
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health Check ──────────────────────────────────────
// Simple endpoint to verify the API is running (used by monitoring tools, Docker, etc.)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DevBoard API is running 🚀',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);

// ─── 404 Handler ───────────────────────────────────────
// Catches requests to undefined routes (app.use as catch-all works in Express 4 & 5)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ──────────────────────────────
// Must be LAST — Express identifies error handlers by having 4 parameters
app.use(errorHandler);

// ═══════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Connect to Redis (non-blocking — app works without it)
  connectRedis();

  app.listen(PORT, () => {
    console.log(`\n🚀 DevBoard API running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth routes:  http://localhost:${PORT}/api/auth\n`);
  });
};

startServer();

// Export app for testing (Jest/Supertest will import this)
module.exports = app;
