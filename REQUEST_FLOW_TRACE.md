# Request Flow Trace: User Updates a Sensor

This document traces the complete flow of a user updating their sensor, showing every security layer and middleware in action.

## Example Request
**Action:** User (testuser, id=2) updates their sensor (id=3)
**Request:** `PUT /api/sensors/3`
**Body:** `{ name: "Updated Temp Sensor", type: "temperature", location: "Office", is_public: false, status: "active" }`

---

## FRONTEND → BACKEND FLOW

### 1. Frontend: User Triggers Update
**File:** `frontend/src/components/Dashboard/Dashboard.jsx` (or similar component)

```javascript
// User clicks "Update Sensor" button
const handleUpdateSensor = async (sensorId, updates) => {
  await api.put(`/sensors/${sensorId}`, updates);
};
```

**What happens:**
- User submits form with updated sensor data
- Component calls `api.put()` from axios client

---

### 2. Frontend: Axios Client Adds CSRF Token
**File:** `frontend/src/api/client.js:22-27`

```javascript
// Request interceptor automatically adds CSRF token
api.interceptors.request.use(config => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method) && csrfToken) {
    config.headers['CSRF-Token'] = csrfToken; // ← CSRF token added here
  }
  return config;
});
```

**Request now includes:**
- **Method:** PUT
- **URL:** http://localhost:5000/api/sensors/3
- **Headers:**
  - `Content-Type: application/json`
  - `CSRF-Token: xK3m9pL2q...` (from previous `/auth/csrf-token` call)
- **Cookies:**
  - `token: eyJhbGciOiJIUzI1...` (JWT auth cookie)
  - `_csrf: xK3m9pL2q...` (CSRF secret cookie)
- **Body:** `{ name: "Updated Temp Sensor", ... }`

---

### 3. Backend: Request Arrives at Express Server
**File:** `server/server.js:37`

```javascript
app.listen(config.server.port, ...);
```

**Server receives:** HTTP PUT request to `/api/sensors/3`

---

### 4. Security Layer 1: Helmet (Security Headers)
**File:** `server/server.js:18-33`

```javascript
app.use(helmet({
  contentSecurityPolicy: { ... },
  crossOriginEmbedderPolicy: ...
}));
```

**What happens:**
- Helmet prepares security headers for the response
- These headers will be sent back with the response:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy: default-src 'self'; ...`
  - `Strict-Transport-Security` (in production)

**Result:** ✅ Security headers prepared → Continue

---

### 5. Security Layer 2: Global Rate Limiter
**File:** `server/server.js:36-43`

```javascript
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,  // 15 minutes
  max: config.rateLimit.maxRequests,    // 100 requests
  message: { error: 'Too many requests, please try again later' }
});
app.use(globalLimiter);
```

**What happens:**
- Checks if client IP has made more than 100 requests in last 15 minutes
- Current count: 23/100 (example)

**Result:** ✅ Under rate limit → Continue

---

### 6. Security Layer 3: CORS
**File:** `server/server.js:46-49`

```javascript
app.use(cors({
  origin: config.server.corsOrigin,  // http://localhost:5173
  credentials: true
}));
```

**What happens:**
- Checks if request origin matches allowed origin
- Request origin: `http://localhost:5173`
- Allowed origin: `http://localhost:5173`

**Result:** ✅ CORS check passed → Continue

---

### 7. Body Parsing
**File:** `server/server.js:52`

```javascript
app.use(express.json());
```

**What happens:**
- Parses JSON body into `req.body` object
- `req.body` now contains: `{ name: "Updated Temp Sensor", ... }`

**Result:** ✅ Body parsed → Continue

---

### 8. Security Layer 4: HTTP Parameter Pollution (HPP)
**File:** `server/server.js:55-57`

```javascript
app.use(hpp({
  whitelist: ['status', 'type']
}));
```

**What happens:**
- Checks for duplicate query parameters (e.g., `?id=1&id=2`)
- Current request has no query params

**Result:** ✅ No parameter pollution → Continue

---

### 9. Cookie Parsing
**File:** `server/server.js:60`

```javascript
app.use(cookieParser());
```

**What happens:**
- Parses cookies into `req.cookies` object
- `req.cookies` now contains:
  - `token: "eyJhbGciOiJIUzI1..."` (JWT)
  - `_csrf: "xK3m9pL2q..."` (CSRF secret)

**Result:** ✅ Cookies parsed → Continue

---

### 10. Route Matching
**File:** `server/server.js:64`

```javascript
app.use('/api/sensors', sensorRoutes);
```

**What happens:**
- Express matches `/api/sensors/3` to sensor routes
- Strips `/api/sensors` prefix, leaving `/:id` for sensor router
- Routes to: `server/routes/sensors.js`

**Result:** ✅ Route matched → Continue to sensor router

---

### 11. Sensor Route: PUT /:id Handler
**File:** `server/routes/sensors.js:115-136`

```javascript
router.put('/:id',
  requireAuth,              // ← Step 12
  requireOwnerOrAdmin(...), // ← Step 13
  csrfProtection,           // ← Step 14
  sensorValidation,         // ← Step 15
  validate,                 // ← Step 16
  (req, res) => { ... }     // ← Step 17 (final handler)
);
```

**What happens:**
- Express executes middleware chain in order
- Each middleware can either:
  - Call `next()` to continue to next middleware
  - Send error response and stop

---

### 12. Middleware 1: requireAuth
**File:** `server/middleware/auth.js:27-47`

```javascript
const requireAuth = (req, res, next) => {
  const token = req.cookies.token; // ← Get JWT from cookie

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // ← Verify JWT signature
    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?')
      .get(decoded.userId); // ← Fetch user from database

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user; // ← Attach user to request object
    next(); // ← Continue to next middleware
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

**What happens:**
1. Extracts JWT from `req.cookies.token`
2. Verifies JWT signature using `JWT_SECRET`
3. Decodes JWT payload: `{ userId: 2 }`
4. Queries database: `SELECT ... FROM users WHERE id = 2`
5. Finds user: `{ id: 2, username: 'testuser', email: 'test@example.com', role: 'user' }`
6. Attaches user to request: `req.user = { id: 2, ... }`

**Result:** ✅ User authenticated → `req.user` set → Continue

---

### 13. Middleware 2: requireOwnerOrAdmin
**File:** `server/middleware/auth.js:92-118`

```javascript
const requireOwnerOrAdmin = (resourceGetter) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin always has access
    if (req.user.role === 'admin') {
      return next(); // ← Admins bypass ownership check
    }

    // Check ownership
    try {
      const resource = resourceGetter(req.params.id); // ← Get sensor from DB
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      if (resource.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' }); // ← RBAC check
      }
      req.resource = resource; // ← Attach resource to avoid duplicate query
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};
```

**What happens:**
1. Checks if `req.user` exists (already set by `requireAuth`)
2. Checks if user is admin: `req.user.role === 'admin'` → `false`
3. Calls `resourceGetter(req.params.id)` → `getSensorById(3)`
4. Queries database: `SELECT * FROM sensors WHERE id = 3`
5. Finds sensor: `{ id: 3, user_id: 2, name: "Temp Sensor", ... }`
6. Checks ownership: `sensor.user_id (2) === req.user.id (2)` → ✅ Match!
7. Attaches sensor to request: `req.resource = { id: 3, ... }`

**Result:** ✅ User owns the sensor → Continue

**If user tried to update someone else's sensor:**
- `sensor.user_id (5) !== req.user.id (2)` → ❌ Mismatch
- Returns `403 Forbidden` → **STOPS HERE**

---

### 14. Middleware 3: CSRF Protection
**File:** `server/routes/sensors.js:10-16`

```javascript
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: config.security.cookieSecure,
    sameSite: 'lax'
  }
});
```

**What happens:**
1. Extracts CSRF token from request header: `req.headers['csrf-token']` → `"xK3m9pL2q..."`
2. Extracts CSRF secret from cookie: `req.cookies._csrf` → `"xK3m9pL2q..."`
3. Validates that token matches secret (cryptographic validation)
4. Token valid: ✅

**Result:** ✅ CSRF token valid → Continue

**If CSRF token is missing or invalid:**
- Returns `403 Forbidden: EBADCSRFTOKEN` → **STOPS HERE**
- Frontend interceptor catches this and refreshes CSRF token

---

### 15. Middleware 4: Sensor Validation
**File:** `server/middleware/validation.js:46-68`

```javascript
const sensorValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Sensor name must be 1-100 characters'),
  body('type')
    .trim()
    .isIn(['temperature', 'humidity', 'pressure', 'motion', 'light'])
    .withMessage('Invalid sensor type'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must be under 200 characters'),
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('is_public must be boolean'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'maintenance'])
    .withMessage('Invalid status')
];
```

**What happens:**
1. Validates `name`: "Updated Temp Sensor" (length 20) → ✅ Valid (1-100 chars)
2. Validates `type`: "temperature" → ✅ Valid (in allowed list)
3. Validates `location`: "Office" → ✅ Valid (under 200 chars)
4. Validates `is_public`: false → ✅ Valid (boolean)
5. Validates `status`: "active" → ✅ Valid (in allowed list)
6. Sanitizes inputs (trims whitespace, normalizes)

**Result:** ✅ All fields valid → Continue

**If validation fails (e.g., invalid type):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Invalid sensor type",
      "param": "type",
      "value": "invalid_type"
    }
  ]
}
```
- Returns `400 Bad Request` → **STOPS HERE**

---

### 16. Middleware 5: Validate Executor
**File:** `server/middleware/validation.js:3-12`

```javascript
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};
```

**What happens:**
1. Collects validation results from previous middleware
2. Checks if any errors exist
3. No errors found

**Result:** ✅ Validation passed → Continue

---

### 17. Final Handler: Update Sensor
**File:** `server/routes/sensors.js:121-135`

```javascript
(req, res) => {
  try {
    const { id } = req.params; // "3"
    const { name, type, location, is_public, status } = req.body;

    db.prepare(
      'UPDATE sensors SET name = ?, type = ?, location = ?, is_public = ?, status = ? WHERE id = ?'
    ).run(name, type, location, is_public ? 1 : 0, status, id);

    const updated = db.prepare('SELECT * FROM sensors WHERE id = ?').get(id);
    res.json({ sensor: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

**What happens:**
1. Extracts sensor ID from URL params: `id = 3`
2. Extracts validated data from `req.body`
3. **Executes UPDATE query** (prepared statement):
   ```sql
   UPDATE sensors
   SET name = 'Updated Temp Sensor',
       type = 'temperature',
       location = 'Office',
       is_public = 0,
       status = 'active'
   WHERE id = 3
   ```
4. Fetches updated sensor: `SELECT * FROM sensors WHERE id = 3`
5. Returns updated sensor as JSON

**Result:** ✅ Database updated → Send response

---

### 18. Backend: Response Sent
**Response:**
```json
{
  "sensor": {
    "id": 3,
    "user_id": 2,
    "name": "Updated Temp Sensor",
    "type": "temperature",
    "location": "Office",
    "is_public": 0,
    "status": "active",
    "created_at": "2025-01-09 10:30:00"
  }
}
```

**Status Code:** 200 OK

**Headers (added by Helmet):**
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
Strict-Transport-Security: max-age=15552000; includeSubDomains
```

---

### 19. Frontend: Axios Response Interceptor
**File:** `frontend/src/api/client.js:30-40`

```javascript
api.interceptors.response.use(
  response => response, // ← Success path
  async error => {
    // Handle CSRF token expiration
    if (error.response?.status === 403 && error.response?.data?.code === 'EBADCSRFTOKEN') {
      await initializeCsrf();
      error.config.headers['CSRF-Token'] = csrfToken;
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

**What happens:**
- Response is successful (200 OK)
- Takes success path: `response => response`
- No error handling needed

**Result:** ✅ Response returned to component

---

### 20. Frontend: Component Receives Response
**File:** `frontend/src/components/Dashboard/Dashboard.jsx` (example)

```javascript
const handleUpdateSensor = async (sensorId, updates) => {
  const response = await api.put(`/sensors/${sensorId}`, updates);
  console.log('Sensor updated:', response.data.sensor);
  // Update UI with new sensor data
};
```

**What happens:**
- Component receives updated sensor data
- UI updates to show new sensor name/values
- User sees confirmation message

---

## SECURITY SUMMARY

### Request Successfully Passed Through:
1. ✅ **Helmet** - Security headers applied
2. ✅ **Global Rate Limiter** - 23/100 requests used
3. ✅ **CORS** - Origin validated
4. ✅ **HPP** - No parameter pollution detected
5. ✅ **JWT Authentication** - User identified and verified
6. ✅ **RBAC (Owner/Admin Check)** - User owns the sensor
7. ✅ **CSRF Protection** - Token validated
8. ✅ **Input Validation** - All fields valid and sanitized
9. ✅ **SQL Injection Prevention** - Prepared statements used
10. ✅ **XSS Prevention** - Input sanitized

### What Would Block This Request?

| Condition | Middleware | Response |
|-----------|-----------|----------|
| No JWT cookie | requireAuth | 401 Unauthorized |
| Invalid JWT | requireAuth | 401 Unauthorized |
| User doesn't own sensor | requireOwnerOrAdmin | 403 Forbidden |
| Missing CSRF token | csrfProtection | 403 Forbidden |
| Invalid CSRF token | csrfProtection | 403 Forbidden |
| Invalid sensor type | sensorValidation | 400 Bad Request |
| Sensor name too long | sensorValidation | 400 Bad Request |
| Over 100 requests/15min | globalLimiter | 429 Too Many Requests |
| Wrong origin | CORS | CORS error (blocked by browser) |

---

## COMPARISON: Before vs After Security Hardening

### BEFORE (Vulnerable):
```
Frontend → Express Router → requireAuth → Handler → Database
```
**Vulnerabilities:**
- ❌ No rate limiting (brute force possible)
- ❌ No CSRF protection (CSRF attacks possible)
- ❌ No input validation (XSS/injection possible)
- ❌ No security headers (clickjacking possible)
- ❌ No parameter pollution protection

### AFTER (Hardened):
```
Frontend (CSRF token) →
  Helmet →
  Rate Limiter →
  CORS →
  HPP →
  requireAuth →
  requireOwnerOrAdmin →
  csrfProtection →
  Validation →
  Handler (prepared statements) →
  Database
```
**Security Layers:**
- ✅ Helmet (XSS, clickjacking, MIME sniffing protection)
- ✅ Rate limiting (brute force protection)
- ✅ CSRF protection (cross-site request forgery prevention)
- ✅ Input validation (XSS, injection prevention)
- ✅ HPP (parameter pollution prevention)
- ✅ Zero-trust RBAC (every request verified)
- ✅ Prepared statements (SQL injection prevention)

---

## ZERO-TRUST ARCHITECTURE PRINCIPLES

### 1. Never Trust, Always Verify
- Every request goes through authentication (`requireAuth`)
- Every resource access checks ownership (`requireOwnerOrAdmin`)
- JWT tokens verified on every request
- CSRF tokens validated on every state-changing request

### 2. Principle of Least Privilege
- Users can only access their own resources
- Admins explicitly granted additional permissions
- No default access to resources

### 3. Defense in Depth
- Multiple security layers
- If one layer fails, others still protect
- Example: Even if CSRF is bypassed, RBAC still blocks unauthorized access

### 4. Explicit Authorization
- Authorization checked at multiple points:
  1. Route level (middleware)
  2. Resource level (ownership)
  3. Action level (validation)

---

## TESTING THE SECURITY LAYERS

### Test 1: Missing JWT Token
```bash
curl -X PUT http://localhost:5000/api/sensors/3 \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacked"}'
```
**Expected:** 401 Unauthorized (blocked at `requireAuth`)

### Test 2: Valid JWT, Wrong Owner
```bash
# User 1 tries to update User 2's sensor
curl -X PUT http://localhost:5000/api/sensors/3 \
  -H "Cookie: token=user1_jwt_token" \
  -H "CSRF-Token: valid_token" \
  -d '{"name":"Hacked"}'
```
**Expected:** 403 Forbidden (blocked at `requireOwnerOrAdmin`)

### Test 3: Missing CSRF Token
```bash
curl -X PUT http://localhost:5000/api/sensors/3 \
  -H "Cookie: token=valid_jwt" \
  -d '{"name":"Hacked"}'
```
**Expected:** 403 Forbidden (blocked at `csrfProtection`)

### Test 4: Invalid Input
```bash
curl -X PUT http://localhost:5000/api/sensors/3 \
  -H "Cookie: token=valid_jwt" \
  -H "CSRF-Token: valid_token" \
  -d '{"name":"Hacked","type":"invalid_type"}'
```
**Expected:** 400 Bad Request (blocked at `sensorValidation`)

### Test 5: SQL Injection Attempt
```bash
curl -X PUT http://localhost:5000/api/sensors/3 \
  -H "Cookie: token=valid_jwt" \
  -H "CSRF-Token: valid_token" \
  -d '{"name":"Test\"; DROP TABLE sensors; --"}'
```
**Expected:**
- Input sanitized by validator
- Prepared statement prevents SQL execution
- Name stored as literal string: `"Test\"; DROP TABLE sensors; --"`

---

## KEY TAKEAWAYS

1. **Every request passes through 10+ security checks** before reaching the database
2. **Authentication and authorization are separate concerns** (JWT auth + ownership check)
3. **CSRF tokens protect state-changing operations** (POST/PUT/DELETE)
4. **Input validation prevents injection attacks** (XSS, SQL injection)
5. **Rate limiting prevents brute force attacks**
6. **Prepared statements are the last line of defense** against SQL injection
7. **Security headers protect against browser-based attacks** (clickjacking, XSS)

This is a **defense-in-depth** approach where multiple independent security layers work together to create a robust, zero-trust architecture.
