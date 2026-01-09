# Dashboard SPA

![alt text](<Screenshot (65).png>)

Full-stack sensor monitoring dashboard with JWT authentication and role-based access control.

## Stack

- **Frontend**: React (Vite), CSS Modules, Recharts
- **Backend**: Express, SQLite (better-sqlite3)
- **Auth**: JWT (HttpOnly cookies, SameSite: strict)
- **Security**: Helmet, rate limiting, CSRF protection via SameSite cookies

## Quick Start

```bash
# Install dependencies
npm install && cd frontend && npm install && cd ..

# Start backend (port 5000)
npm run dev

# Start frontend (port 5173) - separate terminal
cd frontend && npm run dev
```

**Demo Credentials**
- Admin: `admin` / `admin123`
- User: `testuser` / `user123`

## Features

### RBAC
- **Guest**: View public sensors
- **User**: CRUD own sensors, view public sensors
- **Admin**: Full CRUD on all users and sensors

### Security
- JWT in HttpOnly cookies (SameSite: strict)
- Bcrypt password hashing (10 rounds, configurable)
- Rate limiting (100 req/15min global, 5 req/15min auth)
- Helmet with strict CSP (no wildcards, no unsafe-inline for scripts)
- Input validation (express-validator)
- HPP protection
- Parameterized SQL queries
- OpenAPI 3.0 documentation at `/api-docs`

### UI/UX
- 12-column CSS Grid layout
- Light/Dark mode toggle
- Responsive design
- Real-time sensor graphs (Recharts)

## API Routes

### `/api/auth/*` - Authentication
- `POST /register` - Create account
- `POST /login` - Authenticate
- `POST /logout` - Clear session
- `GET /me` - Get current user

### `/api/sensors/*` - Sensor Management
- `GET /public` - Public sensors (no auth)
- `GET /private` - User's sensors + public (auth required)
- `GET /mine` - User's own sensors only (auth required)
- `POST /` - Create sensor
- `PUT /:id` - Update sensor (owner/admin only)
- `DELETE /:id` - Delete sensor (owner/admin only)

### `/api/admin/*` - Admin Operations
All routes require admin role:
- `GET /users` - List all users
- `PUT /users/:id` - Update user (including role)
- `DELETE /users/:id` - Delete user
- `GET /sensors` - List all sensors
- `PUT /sensors/:id` - Update any sensor
- `DELETE /sensors/:id` - Delete any sensor

## Configuration

Set via `.env` file:

```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# JWT (change JWT_SECRET in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_COOKIE_MAX_AGE=604800000

# Security
BCRYPT_ROUNDS=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
```

## Project Structure

```
login/
├── server/
│   ├── server.js          # Express app + OpenAPI config
│   ├── config.js          # Centralized environment config
│   ├── db.js              # SQLite schema & seeding
│   ├── middleware/
│   │   ├── auth.js        # JWT auth middleware
│   │   └── validation.js  # Input validation
│   └── routes/
│       ├── auth.js        # Authentication endpoints
│       ├── sensors.js     # Sensor CRUD
│       └── admin.js       # Admin-only operations
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Layout/    # GuestLayout, UserLayout
│       │   ├── Dashboard/ # Sensor dashboard
│       │   ├── Auth/      # Login, Register
│       │   ├── Sensors/   # User sensor CRUD
│       │   └── Admin/     # Admin panels
│       ├── context/
│       │   └── AuthContext.jsx
│       └── styles/
│           ├── global.css
│           └── grid.module.css
└── .env
```

## Architecture Notes

**Why `/api/auth`, `/api/sensors`, `/api/admin` instead of `/api/guest`, `/api/user`, `/api/admin`?**

Routes are organized by **resource type** (REST principles), not by user role:

- **`/api/auth`** - Handles authentication **actions** (login, register, logout) - not tied to any specific role
- **`/api/sensors`** - Manages sensor **resources** - uses middleware to enforce RBAC (guest sees public, user sees own+public, admin sees all)
- **`/api/admin`** - Admin-specific **operations** that don't fit into normal resource CRUD (user management, cross-user sensor management)

This approach:
- Follows RESTful conventions (resources, not roles)
- Keeps middleware flexible (same endpoint can serve different roles with different data)
- Avoids route duplication (`/api/guest/sensors` vs `/api/user/sensors` vs `/api/admin/sensors` would have overlapping logic)

Example: `GET /api/sensors/public` works for **all** roles (guest, user, admin) without route duplication.

## Database Schema

**users**: id, username, email, password (hashed), role, created_at
**sensors**: id, user_id, name, type, location, is_public, status, created_at
**sensor_readings**: id, sensor_id, value, timestamp

Seeded with 2 users, 5 sensors, and 24 hours of readings.

## Development

```bash
# Backend dev server
npm run dev

# Frontend dev server
cd frontend && npm run dev

# Frontend build
cd frontend && npm run build

# Lint
cd frontend && npm run lint
```

## API Documentation

- **Swagger UI**: `http://localhost:5000/api-docs`
- **OpenAPI JSON** (for ZAP/testing): `http://localhost:5000/api-docs.json`

## Security Testing

Import OpenAPI spec into OWASP ZAP:
1. Start backend: `npm run dev`
2. In ZAP: Import > Import OpenAPI from URL
3. Enter: `http://localhost:5000/api-docs.json`

All endpoints automatically discovered for security scanning.
