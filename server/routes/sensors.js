const express = require('express');
const csrf = require('csurf');
const db = require('../db');
const config = require('../config');
const { optionalAuth, requireAuth, requireOwnerOrAdmin } = require('../middleware/auth');
const { sensorValidation, validate } = require('../middleware/validation');

const router = express.Router();

// Helper to get sensor by ID
const getSensorById = (id) => {
  return db.prepare('SELECT * FROM sensors WHERE id = ?').get(id);
};

// Helper function for role-based sensor queries
const getSensorsForUser = (userId, isAdmin) => {
  if (isAdmin) {
    return db.prepare(`
      SELECT s.*,
        (SELECT json_group_array(json_object('value', value, 'timestamp', timestamp))
         FROM (SELECT value, timestamp FROM sensor_readings WHERE sensor_id = s.id ORDER BY timestamp DESC LIMIT 25)
        ) as readings
      FROM sensors s
      WHERE s.status = 'active'
    `).all();
  } else {
    return db.prepare(`
      SELECT s.*,
        (SELECT json_group_array(json_object('value', value, 'timestamp', timestamp))
         FROM (SELECT value, timestamp FROM sensor_readings WHERE sensor_id = s.id ORDER BY timestamp DESC LIMIT 25)
        ) as readings
      FROM sensors s
      WHERE (s.user_id = ? OR s.is_public = 1) AND s.status = 'active'
    `).all(userId);
  }
};

// CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: config.security.cookieSecure,
    sameSite: 'lax'
  }
});

// GET /api/sensors/public - Guest access (public sensors only)
router.get('/public', (req, res) => {
  try {
    const sensors = db.prepare(`
      SELECT s.*,
        (SELECT json_group_array(json_object('value', value, 'timestamp', timestamp))
         FROM (SELECT value, timestamp FROM sensor_readings WHERE sensor_id = s.id ORDER BY timestamp DESC LIMIT 25)
        ) as readings
      FROM sensors s
      WHERE s.is_public = 1 AND s.status = 'active'
    `).all();

    // Parse readings JSON
    sensors.forEach(sensor => {
      sensor.readings = JSON.parse(sensor.readings);
    });

    res.json({ sensors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensors/private - User/Admin access (own + public sensors)
router.get('/private', requireAuth, (req, res) => {
  try {
    const sensors = getSensorsForUser(req.user.id, req.user.role === 'admin');

    const processedSensors = sensors.map(sensor => ({
      ...sensor,
      readings: JSON.parse(sensor.readings || '[]')
    }));

    res.json({ sensors: processedSensors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensors/mine - User's own sensors
router.get('/mine', requireAuth, (req, res) => {
  try {
    const sensors = db.prepare('SELECT * FROM sensors WHERE user_id = ?').all(req.user.id);
    res.json({ sensors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sensors - Create sensor (User/Admin)
router.post('/', requireAuth, csrfProtection, sensorValidation, validate, (req, res) => {
  try {
    const { name, type, location, is_public } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const result = db.prepare(
      'INSERT INTO sensors (user_id, name, type, location, is_public) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, name, type, location || null, is_public ? 1 : 0);

    const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(result.lastInsertRowid);
    res.json({ sensor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sensors/:id - Update own sensor
router.put('/:id',
  requireAuth,
  requireOwnerOrAdmin(getSensorById),
  csrfProtection,
  sensorValidation,
  validate,
  (req, res) => {
    try {
      const { id } = req.params;
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
);

// DELETE /api/sensors/:id - Delete own sensor
router.delete('/:id',
  requireAuth,
  requireOwnerOrAdmin(getSensorById),
  csrfProtection,
  (req, res) => {
    try {
      const { id } = req.params;

      db.prepare('DELETE FROM sensors WHERE id = ?').run(id);
      res.json({ message: 'Sensor deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
