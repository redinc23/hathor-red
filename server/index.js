require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const { connectRedis } = require('./config/redis');
const setupSocketHandlers = require('./socket/handlers');

// Import routes
const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const playlistRoutes = require('./routes/playlists');
const playbackRoutes = require('./routes/playback');
const roomRoutes = require('./routes/rooms');
const aiRoutes = require('./routes/ai');

// Import services for initialization
const colabAIService = require('./services/colabAIService');
const dataCollectionService = require('./services/dataCollectionService');
const realTimeAnalytics = require('./services/realTimeAnalytics');
const holyShitFeatures = require('./services/holyShitFeatures');
const googleCloud = require('./config/googleCloud');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/playback', playbackRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hathor Music Platform API is running' });
});

// Setup Socket.io handlers
setupSocketHandlers(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Initialize connections and start server
const startServer = async () => {
  try {
    console.log('Starting Hathor Music Platform...');
    
    // Connect to Redis
    await connectRedis();
    console.log('✓ Connected to Redis');

    // Initialize Google Cloud services
    const googleCloudInitialized = await googleCloud.initialize();
    if (googleCloudInitialized) {
      console.log('✓ Google Cloud services initialized');
    } else {
      console.log('○ Google Cloud services not configured (optional)');
    }

    // Initialize Data Collection Service
    const dataCollectionInitialized = await dataCollectionService.initialize();
    if (dataCollectionInitialized) {
      console.log('✓ Data Collection Service initialized');
    } else {
      console.log('⚠ Data Collection Service failed to initialize');
    }

    // Initialize Real-Time Analytics
    const analyticsInitialized = await realTimeAnalytics.initialize();
    if (analyticsInitialized) {
      console.log('✓ Real-Time Analytics initialized');
    } else {
      console.log('⚠ Real-Time Analytics failed to initialize');
    }

    // Initialize Colab AI Service
    const aiInitialized = await colabAIService.initialize();
    if (aiInitialized) {
      console.log('✓ Colab AI Service initialized');
    } else {
      console.log('○ Colab AI Service running in fallback mode (not configured)');
    }

    // Initialize Holy Shit Features
    const holyShitInitialized = await holyShitFeatures.initialize();
    if (holyShitInitialized) {
      console.log('✓ Holy Shit Features initialized');
    } else {
      console.log('⚠ Holy Shit Features failed to initialize');
    }

    // Start server
    server.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log(`🎵 Hathor Music Platform Server Running`);
      console.log('='.repeat(60));
      console.log(`Port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API: http://localhost:${PORT}/api`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      console.log('='.repeat(60) + '\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  // Cleanup services
  await dataCollectionService.cleanup();
  await realTimeAnalytics.cleanup();
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  
  // Cleanup services
  await dataCollectionService.cleanup();
  await realTimeAnalytics.cleanup();
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
