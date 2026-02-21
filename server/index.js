require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { connectRedis, getRedisClient } = require('./config/redis');
const db = require('./config/database');
const setupSocketHandlers = require('./socket/handlers');
const { logger, requestLogger } = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const playlistRoutes = require('./routes/playlists');
const playbackRoutes = require('./routes/playback');
const roomRoutes = require('./routes/rooms');
const aiRoutes = require('./routes/ai');

// Import AI service for initialization
const colabAIService = require('./services/colabAIService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:"]
    }
  }
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/playback', playbackRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/ai', aiRoutes);

// Enhanced health check
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  try {
    await db.query('SELECT 1');
    health.checks.database = { status: 'healthy' };
  } catch (err) {
    health.status = 'degraded';
    health.checks.database = { status: 'unhealthy', error: err.message };
  }

  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      health.checks.redis = { status: 'healthy' };
    }
  } catch (err) {
    health.status = 'degraded';
    health.checks.redis = { status: 'unhealthy', error: err.message };
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

// Serve React App (Static)
const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath));

// SPA Fallback: Any route not handled by API returns index.html
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) return next();
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Socket.io handlers
setupSocketHandlers(io);

// Error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectRedis();
    logger.info('Connected to Redis');

    const aiInitialized = await colabAIService.initialize();
    logger.info(aiInitialized
      ? 'Colab AI Service initialized'
      : 'Colab AI Service running in fallback mode');

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
