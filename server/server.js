require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const config = require('./config');

const authRoutes = require('./routes/auth');
const sensorRoutes = require('./routes/sensors');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
// 1. Security headers first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", config.server.env === 'development' ? "'unsafe-inline'" : ""].filter(Boolean),
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", config.server.env === 'development' ? "ws://localhost:5173" : ""].filter(Boolean),
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: config.server.env !== 'development'
}));

// 2. Rate limiting
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

// 3. CORS
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

// 4. Body parsing
app.use(express.json());

// 5. Parameter pollution protection (after body parsing)
app.use(hpp({
  whitelist: ['status', 'type'] // Allow arrays for sensor filtering
}));

// 6. Cookie parsing
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    config: {
      jwtExpiresIn: config.jwt.expiresIn,
      environment: config.server.env
    }
  });
});

app.listen(config.server.port, () => {
  console.log(`Server running on http://localhost:${config.server.port}`);
  console.log(`Environment: ${config.server.env}`);
  console.log(`JWT Expires: ${config.jwt.expiresIn}`);
});
