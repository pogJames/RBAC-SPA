const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

const JWT_SECRET = config.jwt.secret;

// Optional auth - attaches user to req if token exists, but doesn't block request
const optionalAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.userId);
      if (user) {
        req.user = user;
      }
    } catch (err) {
      // Invalid token, continue as guest
    }
  }

  next();
};

// Require authenticated user (user or admin)
const requireAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Require specific role(s)
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Require admin role
const requireAdmin = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Require owner or admin (for resource access control)
const requireOwnerOrAdmin = (resourceGetter) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin always has access
    if (req.user.role === 'admin') {
      return next();
    }

    // Check ownership
    try {
      const resource = resourceGetter(req.params.id);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      if (resource.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to access this resource' });
      }
      req.resource = resource; // Attach to req to avoid duplicate query
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};

module.exports = {
  optionalAuth,
  requireAuth,
  requireRole,
  requireAdmin,
  requireOwnerOrAdmin
};
