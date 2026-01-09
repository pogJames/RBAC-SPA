module.exports = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d', // 7 days, 1h, 30m, etc.
    cookieMaxAge: process.env.JWT_COOKIE_MAX_AGE || 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  },

  // Rate Limiting (requests per window)
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 100 // max requests per window
  },

  // Auth Rate Limiting (stricter for authentication endpoints)
  authRateLimit: {
    windowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
    maxRequests: process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 5 // max auth attempts per window
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    env: process.env.NODE_ENV || 'development'
  },

  // Database Configuration
  database: {
    path: process.env.DB_PATH || './server/database.db'
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieHttpOnly: true,
    cookieSameSite: 'lax'
  },

  // Helmet Configuration
  helmet: {
    strictCSP: process.env.NODE_ENV === 'production'
  }
};
