require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');

const authRoutes = require('./routes/auth');
const sensorRoutes = require('./routes/sensors');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));
app.use(express.json());
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
