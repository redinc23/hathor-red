/**
 * CORS configuration for the Hathor Music Platform.
 * Provides restricted origin access based on environment.
 */

const corsOptions = {
  origin: (origin, callback) => {
    // Get allowed origins from environment variable
    const clientUrl = process.env.CLIENT_URL;
    const allowedOrigins = clientUrl ? clientUrl.split(',').map(o => o.trim()) : [];

    // In non-production environments, allow localhost:3000 as a default fallback
    if (process.env.NODE_ENV !== 'production') {
      if (!allowedOrigins.includes('http://localhost:3000')) {
        allowedOrigins.push('http://localhost:3000');
      }
    }

    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, we are strict and return false to deny CORS headers.
      // In development/test, we can return an error for better debugging.
      if (process.env.NODE_ENV === 'production') {
        callback(null, false);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = corsOptions;
