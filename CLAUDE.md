# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack Sensor Dashboard SPA with role-based access control (Guest, User, Admin). Built with React (Vite) frontend and Express backend, using SQLite for data persistence and JWT for authentication.

## Development Commands

### Running the Application

**Backend server (from root):**
```bash
npm run dev
# or
npm start
```
Server runs on `http://localhost:5000` (configurable via PORT in .env)

**Frontend dev server (from frontend/):**
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

**Both servers must be running simultaneously for the application to work.**

### Frontend Commands (from frontend/)

```bash
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

## Architecture

### Backend Structure (CommonJS)

**Configuration centralization:** All environment-based settings are consolidated in `server/config.js`, which exports configuration objects used throughout the backend. Always import from `config.js` rather than accessing `process.env` directly in route/middleware files.

**Database initialization:** `server/db.js` handles SQLite schema creation, seeding, and exports the database instance. The database auto-seeds with 2 users and 5 sensors with 24 hours of readings on first run.

**Authentication flow:**
- JWT tokens stored in HTTP-only cookies (not localStorage)
- `server/middleware/auth.js` exports multiple middleware: `optionalAuth` (attaches user if token exists), `requireAuth` (blocks unauthenticated), `requireAdmin` (blocks non-admin)
- All admin middleware must verify JWT token from cookies AND check user role - never rely on `req.user` being pre-populated for admin routes

**Route organization:**
- `/api/auth/*` - Register, login, logout, current user
- `/api/sensors/*` - Sensor CRUD with RBAC (public, private, mine endpoints)
- `/api/admin/*` - Admin-only user and sensor management (all routes protected by `requireAdmin`)

### Frontend Structure (ES Modules)

**Layout system:** Two distinct layouts based on auth state:
- `GuestLayout` - Used for unauthenticated users and auth pages (login/register). Has sidebar with guest info + main content area.
- `UserLayout` - Used for authenticated users. Has sidebar with navigation + user info + main content area.
- Both use 12-column CSS Grid: sidebar (cols 1-3), main (cols 4-12)

**Routing architecture:** `App.jsx` contains nested route protection:
- `GuestRoute` wrapper applies `GuestLayout`
- `ProtectedRoute` wrapper applies `UserLayout` and checks authentication
- `ProtectedRoute` with `requireAdmin` prop blocks non-admin users
- Authenticated users redirected away from `/login` and `/register`
- Unauthenticated users redirected to `/login` from protected routes

**State management:** `AuthContext` provides global auth state via React Context:
- Checks auth status on mount via `/api/auth/me`
- Exposes `user`, `loading`, `login()`, `register()`, `logout()`
- All API calls use `src/api/client.js` (axios instance with credentials)

**Theming:** Theme state managed in `ThemeToggle` component with localStorage persistence. Theme applied via `data-theme` attribute on `document.documentElement`. CSS variables in `global.css` respond to `[data-theme="dark"]`.

### 12-Column Grid System

Custom CSS Grid implementation in `styles/grid.module.css`:
- `.container` establishes 12-column grid
- `.col[1-12]` classes for spanning columns
- `.start[1-12]` classes for positioning
- Guest and User layouts both use: header (cols 1-13), sidebar (cols 1-4), main (cols 4-13)

### Database Schema

**Users:** id, username, email, password (bcrypt hashed), role ('guest'|'user'|'admin'), created_at

**Sensors:** id, user_id, name, type, location, is_public (boolean), status ('active'|'inactive'|'maintenance'), created_at

**Sensor_readings:** id, sensor_id, value, timestamp (for Recharts graphing)

## Configuration

All settings are environment-based via `.env` and imported through `server/config.js`. See `CONFIGURATION.md` for comprehensive list. Key settings:

- `JWT_SECRET` - Must change for production
- `JWT_EXPIRES_IN` - Token lifetime (e.g., '7d', '24h')
- `JWT_COOKIE_MAX_AGE` - Cookie lifetime in milliseconds (must match JWT_EXPIRES_IN)
- `BCRYPT_ROUNDS` - Password hashing complexity (10-12 for production)

**Important:** When modifying auth logic, always use `config.jwt.*` and `config.security.*` values rather than hardcoding durations or security parameters.

## Key Implementation Details

**Authentication cookies:** Set with `httpOnly`, `secure` (in production), and `sameSite: 'lax'`. Frontend axios must use `withCredentials: true`.

**RBAC endpoint patterns:**
- `/api/sensors/public` - No auth required, returns only `is_public=1` sensors
- `/api/sensors/private` - Requires auth, returns user's sensors OR all sensors if admin
- `/api/sensors/mine` - Requires auth, returns only current user's sensors
- `/api/admin/*` - All require admin role verification

**Sensor readings for charts:** Stored as JSON array in sensor query results, parsed in frontend. Each reading has `{value, timestamp}`. Charts use Recharts library with data transformed via `formatChartData()` in Dashboard component.

**Form error handling:** Login/Register forms clear password field on error and display error message from backend. Forms reset when switching between login/register via routing.

**Admin middleware critical note:** The `requireAdmin` middleware in `server/middleware/auth.js` must independently verify the JWT token from cookies - it cannot rely on `req.user` being set by previous middleware since admin routes use `router.use(requireAdmin)` as the first middleware.

## Demo Credentials

- Admin: `admin` / `admin123`
- User: `testuser` / `user123`

Database auto-seeds on first run with these users plus sample sensors.
