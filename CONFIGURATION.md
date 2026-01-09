# Configuration Guide

All configuration can be customized via environment variables in the `.env` file or system environment.

## Available Configuration Options

### Server Configuration

**PORT** (default: `5000`)
- The port the server runs on
- Example: `PORT=3000`

**NODE_ENV** (default: `development`)
- Environment mode: `development`, `production`, or `test`
- Affects logging, error messages, and security settings
- Example: `NODE_ENV=production`

**CORS_ORIGIN** (default: `http://localhost:5173`)
- Allowed CORS origin for frontend
- Change if frontend runs on different port
- Example: `CORS_ORIGIN=http://localhost:3000`

### JWT Authentication

**JWT_SECRET** (default: `your-super-secret-jwt-key-change-this-in-production`)
- Secret key for signing JWT tokens
- **CRITICAL**: Change this in production!
- Should be a long random string
- Example: `JWT_SECRET=a5f8e3b2c9d1e7f4a6b8c2d9e1f3a7b4`

**JWT_EXPIRES_IN** (default: `7d`)
- How long JWT tokens remain valid
- Formats: `7d` (days), `24h` (hours), `30m` (minutes), `3600` (seconds)
- Example: `JWT_EXPIRES_IN=24h`

**JWT_COOKIE_MAX_AGE** (default: `604800000`)
- Max age of JWT cookie in milliseconds
- Should match JWT_EXPIRES_IN duration
- 7 days = 7 * 24 * 60 * 60 * 1000 = 604800000
- Example: `JWT_COOKIE_MAX_AGE=86400000` (1 day)

### Security

**BCRYPT_ROUNDS** (default: `10`)
- Number of bcrypt salt rounds for password hashing
- Higher = more secure but slower
- Recommended: 10-12 for production
- Example: `BCRYPT_ROUNDS=12`

### Rate Limiting

**RATE_LIMIT_WINDOW_MS** (default: `900000`)
- Time window for rate limiting in milliseconds
- Default: 15 minutes (15 * 60 * 1000 = 900000)
- Example: `RATE_LIMIT_WINDOW_MS=600000` (10 minutes)

**RATE_LIMIT_MAX_REQUESTS** (default: `100`)
- Maximum requests allowed per window
- Adjust based on expected traffic
- Example: `RATE_LIMIT_MAX_REQUESTS=200`

### Database

**DB_PATH** (default: `./server/database.db`)
- Path to SQLite database file
- Relative or absolute path
- Example: `DB_PATH=/var/data/sensors.db`

## Example Configurations

### Development (Default)
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=dev-secret-key
JWT_EXPIRES_IN=7d
JWT_COOKIE_MAX_AGE=604800000
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
DB_PATH=./server/database.db
```

### Production
```env
PORT=8080
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=super-long-random-production-secret-key-here
JWT_EXPIRES_IN=24h
JWT_COOKIE_MAX_AGE=86400000
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
DB_PATH=/var/data/sensors.db
```

### Short-Lived Tokens (High Security)
```env
JWT_EXPIRES_IN=15m
JWT_COOKIE_MAX_AGE=900000
BCRYPT_ROUNDS=12
```

### Long-Lived Tokens (Convenience)
```env
JWT_EXPIRES_IN=30d
JWT_COOKIE_MAX_AGE=2592000000
```

## Quick Reference

### Time Conversions
- 1 minute = `60000` ms
- 1 hour = `3600000` ms
- 1 day = `86400000` ms
- 7 days = `604800000` ms
- 30 days = `2592000000` ms

### JWT Time Formats
- `60` = 60 seconds
- `5m` = 5 minutes
- `2h` = 2 hours
- `7d` = 7 days

## Security Best Practices

1. **Always change JWT_SECRET in production**
   - Use a long random string (32+ characters)
   - Never commit secrets to version control

2. **Use HTTPS in production**
   - Cookies will be marked as `secure`
   - Prevents token interception

3. **Adjust token expiration based on needs**
   - Shorter = more secure but less convenient
   - Longer = more convenient but higher risk if compromised

4. **Set appropriate rate limits**
   - Prevents brute force attacks
   - Adjust based on expected traffic

5. **Use higher bcrypt rounds in production**
   - 10-12 is recommended balance
   - Test performance impact first
