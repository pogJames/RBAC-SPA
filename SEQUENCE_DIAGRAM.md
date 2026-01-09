# Security Architecture Sequence Diagram

## Complete Request Flow: User Updates Sensor

```mermaid
sequenceDiagram
    participant U as User Browser
    participant F as Frontend (React)
    participant A as Axios Client
    participant H as Helmet
    participant R as Rate Limiter
    participant C as CORS
    participant HP as HPP
    participant Auth as requireAuth
    participant RBAC as requireOwnerOrAdmin
    participant CSRF as CSRF Protection
    participant Val as Input Validation
    participant Hand as Route Handler
    participant DB as SQLite Database

    U->>F: Clicks "Update Sensor"
    F->>A: api.put('/sensors/3', data)

    Note over A: Adds CSRF token from memory
    A->>H: PUT /api/sensors/3<br/>[JWT Cookie + CSRF Token]

    Note over H: Layer 1: Security Headers
    H->>H: Prepare security headers<br/>(X-Frame-Options, CSP, etc.)
    H->>R: ✅ Continue

    Note over R: Layer 2: Rate Limiting
    R->>R: Check request count<br/>(23/100 in 15min window)
    R->>C: ✅ Continue

    Note over C: Layer 3: CORS
    C->>C: Verify origin<br/>(localhost:5173 allowed)
    C->>HP: ✅ Continue

    Note over HP: Layer 4: HPP
    HP->>HP: Check for duplicate params<br/>(none found)
    HP->>Auth: ✅ Continue

    Note over Auth: Layer 5: JWT Authentication
    Auth->>Auth: Extract JWT from cookie
    Auth->>DB: SELECT user WHERE id = ?
    DB-->>Auth: User data (id=2, role=user)
    Auth->>Auth: Set req.user = {id:2, role:'user'}
    Auth->>RBAC: ✅ Continue

    Note over RBAC: Layer 6: RBAC (Ownership)
    RBAC->>DB: SELECT sensor WHERE id = 3
    DB-->>RBAC: Sensor data (user_id=2)
    RBAC->>RBAC: Check: sensor.user_id == req.user.id<br/>✅ User owns this sensor
    RBAC->>CSRF: ✅ Continue

    Note over CSRF: Layer 7: CSRF Protection
    CSRF->>CSRF: Validate CSRF token<br/>(header matches cookie secret)
    CSRF->>Val: ✅ Continue

    Note over Val: Layer 8: Input Validation
    Val->>Val: Validate name (1-100 chars)<br/>Validate type (in allowed list)<br/>Sanitize all inputs
    Val->>Hand: ✅ Continue

    Note over Hand: Layer 9: Route Handler
    Hand->>DB: UPDATE sensors SET ...<br/>WHERE id = 3<br/>[Prepared Statement]
    DB-->>Hand: Update successful
    Hand->>DB: SELECT * FROM sensors<br/>WHERE id = 3
    DB-->>Hand: Updated sensor data

    Hand->>A: 200 OK<br/>{sensor: {...}}<br/>[+ Security Headers]
    A->>F: Response data
    F->>U: UI updates with new data

    Note over U,DB: ✅ Request Successful<br/>Passed through 10+ security layers
```

---

## Attack Scenarios (Request Blocked)

### Scenario 1: Missing Authentication
```mermaid
sequenceDiagram
    participant U as Attacker
    participant Auth as requireAuth

    U->>Auth: PUT /api/sensors/3<br/>[No JWT Cookie]
    Auth->>Auth: Check for JWT cookie
    Auth-->>U: ❌ 401 Unauthorized<br/>"Authentication required"

    Note over U,Auth: BLOCKED at Layer 5
```

---

### Scenario 2: Unauthorized Access (Wrong Owner)
```mermaid
sequenceDiagram
    participant U as User 1 (Attacker)
    participant Auth as requireAuth
    participant RBAC as requireOwnerOrAdmin
    participant DB as Database

    U->>Auth: PUT /api/sensors/5<br/>[User 1's JWT Cookie]
    Auth->>DB: SELECT user WHERE id = 1
    DB-->>Auth: User 1 data
    Auth->>RBAC: ✅ Authenticated<br/>req.user = {id: 1}
    RBAC->>DB: SELECT sensor WHERE id = 5
    DB-->>RBAC: Sensor 5 (user_id=2)
    RBAC->>RBAC: Check ownership:<br/>sensor.user_id (2) != req.user.id (1)
    RBAC-->>U: ❌ 403 Forbidden<br/>"Not authorized"

    Note over U,DB: BLOCKED at Layer 6 (RBAC)
```

---

### Scenario 3: CSRF Attack
```mermaid
sequenceDiagram
    participant E as Evil Site
    participant U as Victim's Browser
    participant Auth as requireAuth
    participant RBAC as requireOwnerOrAdmin
    participant CSRF as CSRF Protection

    E->>U: <form action="app.com/api/sensors/3"><br/>Submit hidden form
    U->>Auth: PUT /api/sensors/3<br/>[Victim's JWT Cookie]<br/>[❌ No CSRF Token]
    Auth->>Auth: ✅ JWT valid
    Auth->>RBAC: ✅ Continue
    RBAC->>RBAC: ✅ Owner verified
    RBAC->>CSRF: Continue
    CSRF->>CSRF: Check CSRF token<br/>❌ Token missing or invalid
    CSRF-->>U: ❌ 403 Forbidden<br/>"EBADCSRFTOKEN"
    U->>E: Attack failed

    Note over E,CSRF: BLOCKED at Layer 7 (CSRF)
```

---

### Scenario 4: SQL Injection Attempt
```mermaid
sequenceDiagram
    participant U as Attacker
    participant Auth as requireAuth
    participant RBAC as requireOwnerOrAdmin
    participant CSRF as CSRF Protection
    participant Val as Input Validation
    participant Hand as Route Handler
    participant DB as Database

    U->>Auth: PUT /api/sensors/3<br/>{name: "Test'; DROP TABLE sensors; --"}
    Auth->>RBAC: ✅ Authenticated
    RBAC->>CSRF: ✅ Authorized
    CSRF->>Val: ✅ CSRF valid

    Note over Val: Input Validation & Sanitization
    Val->>Val: Sanitize input:<br/>Escape special characters<br/>Validate length
    Val->>Hand: ✅ Sanitized input

    Note over Hand: Prepared Statement (Final Defense)
    Hand->>DB: UPDATE sensors<br/>SET name = ?<br/>WHERE id = ?<br/>Params: ["Test'; DROP...", 3]
    DB->>DB: Treat entire string as literal<br/>No SQL execution
    DB-->>Hand: Update successful
    Hand-->>U: 200 OK<br/>name: "Test'; DROP TABLE sensors; --"

    Note over U,DB: ✅ Attack PREVENTED<br/>String stored as literal text
```

---

### Scenario 5: Brute Force Attack
```mermaid
sequenceDiagram
    participant A as Attacker
    participant R as Rate Limiter
    participant Auth as Auth Route

    loop Attempts 1-5
        A->>R: POST /auth/login<br/>[Wrong password]
        R->>R: Count: 1/5, 2/5, 3/5, 4/5, 5/5
        R->>Auth: ✅ Allow
        Auth-->>A: ❌ 401 Invalid credentials
    end

    A->>R: POST /auth/login<br/>[Attempt #6]
    R->>R: Count: 6/5<br/>❌ Over limit!
    R-->>A: ❌ 429 Too Many Requests<br/>"Too many authentication attempts"

    Note over A,Auth: BLOCKED at Layer 2<br/>Wait 15 minutes before retry
```

---

## Zero-Trust Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Axios)                   │
│  • CSRF token management                                      │
│  • Automatic token refresh                                    │
│  • Credentials included in requests                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP Request
                      │ [JWT Cookie + CSRF Token + Data]
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                          │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Helmet        │ XSS, Clickjacking Protection        │
│ Layer 2: Rate Limiter  │ Brute Force Prevention              │
│ Layer 3: CORS          │ Origin Validation                   │
│ Layer 4: HPP           │ Parameter Pollution Prevention      │
│ Layer 5: requireAuth   │ JWT Verification + User Lookup      │
│ Layer 6: RBAC          │ Ownership/Role Authorization        │
│ Layer 7: CSRF          │ Cross-Site Request Forgery Defense  │
│ Layer 8: Validation    │ Input Sanitization & Format Check   │
│ Layer 9: Handler       │ Business Logic                      │
│ Layer 10: DB           │ Prepared Statements (SQL Injection) │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Response
                      │ [Data + Security Headers]
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND RECEIVES                        │
│  • Data for UI update                                         │
│  • Error handling (401/403/400/429)                           │
│  • CSRF token refresh on expiration                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Decision Tree

```
                    ┌──────────────┐
                    │  Request     │
                    │  Arrives     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Rate Limit   │
                    │ Exceeded?    │
                    └──┬───────┬───┘
                  YES  │       │ NO
            ┌──────────┘       └──────────┐
            │                              │
        ┌───▼────┐                    ┌───▼────┐
        │ 429    │                    │  JWT   │
        │ Error  │                    │ Valid? │
        └────────┘                    └───┬────┘
                                          │
                                    ┌─────┴─────┐
                                 NO │           │ YES
                          ┌─────────┘           └─────────┐
                          │                               │
                      ┌───▼────┐                     ┌────▼────┐
                      │ 401    │                     │  User   │
                      │ Error  │                     │  Owns   │
                      └────────┘                     │Resource?│
                                                     └────┬────┘
                                                          │
                                                    ┌─────┴─────┐
                                                 NO │           │ YES
                                          ┌─────────┘           └─────────┐
                                          │                               │
                                      ┌───▼────┐                     ┌────▼────┐
                                      │ 403    │                     │  CSRF   │
                                      │ Error  │                     │  Valid? │
                                      └────────┘                     └────┬────┘
                                                                          │
                                                                    ┌─────┴─────┐
                                                                 NO │           │ YES
                                                          ┌─────────┘           └─────────┐
                                                          │                               │
                                                      ┌───▼────┐                     ┌────▼────┐
                                                      │ 403    │                     │  Input  │
                                                      │ Error  │                     │  Valid? │
                                                      └────────┘                     └────┬────┘
                                                                                          │
                                                                                    ┌─────┴─────┐
                                                                                 NO │           │ YES
                                                                          ┌─────────┘           └─────────┐
                                                                          │                               │
                                                                      ┌───▼────┐                     ┌────▼────┐
                                                                      │ 400    │                     │ Process │
                                                                      │ Error  │                     │ Request │
                                                                      └────────┘                     └────┬────┘
                                                                                                          │
                                                                                                          │
                                                                                                     ┌────▼────┐
                                                                                                     │   200   │
                                                                                                     │ Success │
                                                                                                     └─────────┘
```

---

## Current Architecture vs Zero-Trust

### OLD (Vulnerable) Architecture:
```
Request → Router → Basic Auth → Handler → Database
    ↓
Single point of failure
No defense-in-depth
```

### NEW (Zero-Trust) Architecture:
```
Request → Multiple Security Layers → Handler → Database
    ↓
Defense-in-depth
Never trust, always verify
Principle of least privilege
Explicit authorization at every level
```

---

## Key Principles Demonstrated

1. **Never Trust, Always Verify**
   - Every request authenticated (JWT)
   - Every resource access authorized (RBAC)
   - Every state change protected (CSRF)

2. **Defense in Depth**
   - 10+ independent security layers
   - If one fails, others still protect
   - Multiple validation points

3. **Principle of Least Privilege**
   - Users only access their own resources
   - Admins explicitly granted elevated permissions
   - No default access

4. **Explicit Security**
   - No implicit trust
   - All permissions checked explicitly
   - All inputs validated explicitly

5. **Fail Secure**
   - Default action is deny
   - Errors stop processing
   - No fallback to insecure paths
