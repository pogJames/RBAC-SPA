const express = require('express');
const db = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();

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
    let sensors;

    if (req.user.role === 'admin') {
      // Admin sees all sensors
      sensors = db.prepare(`
        SELECT s.*,
          (SELECT json_group_array(json_object('value', value, 'timestamp', timestamp))
           FROM (SELECT value, timestamp FROM sensor_readings WHERE sensor_id = s.id ORDER BY timestamp DESC LIMIT 25)
          ) as readings
        FROM sensors s
        WHERE s.status = 'active'
      `).all();
    } else {
      // User sees own sensors + public sensors
      sensors = db.prepare(`
        SELECT s.*,
          (SELECT json_group_array(json_object('value', value, 'timestamp', timestamp))
           FROM (SELECT value, timestamp FROM sensor_readings WHERE sensor_id = s.id ORDER BY timestamp DESC LIMIT 25)
          ) as readings
        FROM sensors s
        WHERE (s.user_id = ? OR s.is_public = 1) AND s.status = 'active'
      `).all(req.user.id);
    }

    sensors.forEach(sensor => {
      sensor.readings = JSON.parse(sensor.readings);
    });

    res.json({ sensors });
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
router.post('/', requireAuth, (req, res) => {
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
router.put('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, location, is_public, status } = req.body;

    // Check ownership
    const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(id);
    if (!sensor) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    if (sensor.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this sensor' });
    }

    db.prepare(
      'UPDATE sensors SET name = ?, type = ?, location = ?, is_public = ?, status = ? WHERE id = ?'
    ).run(name, type, location, is_public ? 1 : 0, status, id);

    const updated = db.prepare('SELECT * FROM sensors WHERE id = ?').get(id);
    res.json({ sensor: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sensors/:id - Delete own sensor
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;

    const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(id);
    if (!sensor) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    if (sensor.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this sensor' });
    }

    db.prepare('DELETE FROM sensors WHERE id = ?').run(id);
    res.json({ message: 'Sensor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
