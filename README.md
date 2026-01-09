# Sensor Dashboard SPA

A full-stack sensor monitoring dashboard with role-based access control (Guest, User, Admin).

## Stack

- **Frontend**: React (Vite) + CSS Modules + Recharts
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT in HTTP-only cookies

## Features

### Layout
- **Guest**: Sidebar (cols 1-3) + Main (cols 4-12) with guest info
- **User/Admin**: Sidebar (cols 1-3) + Main content (cols 4-12)
- Custom 12-column CSS Grid system
- Light/Dark mode toggle

### RBAC
- **Guest**: View public sensors only
- **User**: CRUD on own sensors + view private sensors
- **Admin**: Full CRUD on all users and sensors

### UI/UX
- Responsive layouts with CSS Grid
- Light/Dark theme support
- Real-time sensor graphs with Recharts
- Form validation and error handling
- Password reset on login failure

## Quick Start

### 1. Install Dependencies

```bash
# Root dependencies (already installed)
npm install

# Frontend dependencies (already installed)
cd frontend
npm install
```

### 2. Start Backend Server

```bash
# From root directory
npm run dev
```

Server runs on `http://localhost:5000`

### 3. Start Frontend Dev Server

```bash
# From frontend directory
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

## Demo Credentials

- **Admin**: `admin` / `admin123`
- **User**: `testuser` / `user123`

## Configuration

All settings can be customized via environment variables in `.env`. See [CONFIGURATION.md](./CONFIGURATION.md) for detailed documentation.

**Quick config examples:**

```env
# Change JWT expiration
JWT_EXPIRES_IN=24h

# Change token duration to 1 hour
JWT_COOKIE_MAX_AGE=3600000

# Increase bcrypt security
BCRYPT_ROUNDS=12

# Adjust rate limiting
RATE_LIMIT_MAX_REQUESTS=50
```

## Project Structure

```
login/
├── server/
│   ├── db.js                 # SQLite schema & seeding
│   ├── server.js             # Express app
│   ├── middleware/
│   │   └── auth.js           # JWT auth middleware
│   └── routes/
│       ├── auth.js           # Auth routes
│       ├── sensors.js        # Sensor routes
│       └── admin.js          # Admin routes
├── frontend/
│   └── src/
│       ├── api/
│       │   └── client.js     # Axios config
│       ├── components/
│       │   ├── Layout/       # Guest & User layouts
│       │   ├── Dashboard/    # Sensor dashboard
│       │   ├── Sensors/      # User sensor CRUD
│       │   ├── Admin/        # Admin panels
│       │   └── Auth/         # Login & Register
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── styles/
│       │   ├── global.css
│       │   └── grid.module.css
│       └── App.jsx
└── .env
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Sensors
- `GET /api/sensors/public` - Public sensors (Guest)
- `GET /api/sensors/private` - Private sensors (User/Admin)
- `GET /api/sensors/mine` - User's own sensors
- `POST /api/sensors` - Create sensor
- `PUT /api/sensors/:id` - Update sensor
- `DELETE /api/sensors/:id` - Delete sensor

### Admin
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/sensors` - Get all sensors
- `PUT /api/admin/sensors/:id` - Update sensor
- `DELETE /api/admin/sensors/:id` - Delete sensor

## Database Schema

### Users
- id, username, email, password (hashed), role, created_at

### Sensors
- id, user_id, name, type, location, is_public, status, created_at

### Sensor Readings
- id, sensor_id, value, timestamp

## Dummy Data

Database includes:
- 2 users (admin, testuser)
- 5 sensors (3 public, 2 private)
- 24 hours of readings per sensor
