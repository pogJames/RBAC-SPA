const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const db = require('../db');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { validatePassword } = require('../utils/passwordValidator');
const { registerValidation, loginValidation, validate } = require('../middleware/validation');

const router = express.Router();

// Auth-specific rate limiter (stricter than global)
const authLimiter = rateLimit({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.maxRequests,
  skipSuccessfulRequests: true,
  message: { error: 'Too many authentication attempts, please try again later' }
});

// CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: config.security.cookieSecure,
    sameSite: 'lax'
  }
});

// CSRF token endpoint
router.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Register
router.post('/register', authLimiter, csrfProtection, registerValidation, validate, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        requirements: validation.errors
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    // Insert user
    const result = db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(
      username, email, hashedPassword, 'user'
    );

    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Generate token
    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.cookie('token', token, {
      httpOnly: config.security.cookieHttpOnly,
      secure: config.security.cookieSecure,
      sameSite: config.security.cookieSameSite,
      maxAge: config.jwt.cookieMaxAge
    });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', authLimiter, csrfProtection, loginValidation, validate, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.cookie('token', token, {
      httpOnly: config.security.cookieHttpOnly,
      secure: config.security.cookieSecure,
      sameSite: config.security.cookieSameSite,
      maxAge: config.jwt.cookieMaxAge
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
router.post('/logout', csrfProtection, (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
