require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
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

// Swagger/OpenAPI Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sensor Dashboard API',
      version: '1.0.0',
      description: 'Full-stack Sensor Dashboard SPA with role-based access control (Guest, User, Admin). Built with React (Vite) frontend and Express backend, using SQLite for data persistence and JWT for authentication.',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server'
      },
      {
        url: 'https://api.yourdomain.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT token stored in HttpOnly cookie'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'admin' },
            email: { type: 'string', format: 'email', example: 'admin@example.com' },
            role: { type: 'string', enum: ['guest', 'user', 'admin'], example: 'admin' },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' }
          }
        },
        Sensor: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Temperature Sensor' },
            type: { type: 'string', enum: ['temperature', 'humidity', 'pressure', 'light', 'motion', 'sound'], example: 'temperature' },
            location: { type: 'string', example: 'Living Room' },
            is_public: { type: 'boolean', example: false },
            status: { type: 'string', enum: ['active', 'inactive', 'maintenance'], example: 'active' },
            created_at: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
            readings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'number', example: 22.5 },
                  timestamp: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Sensors',
        description: 'Sensor CRUD operations with RBAC'
      },
      {
        name: 'Admin',
        description: 'Admin-only user and sensor management'
      }
    ]
  },
  apis: ['./server/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Sensor Dashboard API Docs'
}));

// OpenAPI JSON endpoint (for ZAP import)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

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
