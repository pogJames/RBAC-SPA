const express = require('express');
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

/**
 * @openapi
 * /api/sensors/public:
 *   get:
 *     tags:
 *       - Sensors
 *     summary: Get public sensors
 *     description: Get all public sensors (no authentication required)
 *     responses:
 *       200:
 *         description: Public sensors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sensors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sensor'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @openapi
 * /api/sensors/private:
 *   get:
 *     tags:
 *       - Sensors
 *     summary: Get private sensors
 *     description: Get user's own sensors + public sensors (admins see all sensors)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sensors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sensors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sensor'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @openapi
 * /api/sensors/mine:
 *   get:
 *     tags:
 *       - Sensors
 *     summary: Get own sensors
 *     description: Get only the current user's sensors
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User sensors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sensors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sensor'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/mine', requireAuth, (req, res) => {
  try {
    const sensors = db.prepare('SELECT * FROM sensors WHERE user_id = ?').all(req.user.id);
    res.json({ sensors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/sensors:
 *   post:
 *     tags:
 *       - Sensors
 *     summary: Create sensor
 *     description: Create a new sensor (requires authentication)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: Living Room Temperature
 *               type:
 *                 type: string
 *                 enum: [temperature, humidity, pressure, light, motion, sound]
 *                 example: temperature
 *               location:
 *                 type: string
 *                 maxLength: 200
 *                 example: Living Room
 *               is_public:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Sensor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sensor:
 *                   $ref: '#/components/schemas/Sensor'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', requireAuth, sensorValidation, validate, (req, res) => {
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

/**
 * @openapi
 * /api/sensors/{id}:
 *   put:
 *     tags:
 *       - Sensors
 *     summary: Update sensor
 *     description: Update own sensor (or any sensor if admin)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sensor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: Updated Sensor Name
 *               type:
 *                 type: string
 *                 enum: [temperature, humidity, pressure, light, motion, sound]
 *                 example: temperature
 *               location:
 *                 type: string
 *                 maxLength: 200
 *                 example: Bedroom
 *               is_public:
 *                 type: boolean
 *                 example: true
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *                 example: active
 *     responses:
 *       200:
 *         description: Sensor updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sensor:
 *                   $ref: '#/components/schemas/Sensor'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized (not owner or admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Sensor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags:
 *       - Sensors
 *     summary: Delete sensor
 *     description: Delete own sensor (or any sensor if admin)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sensor ID
 *     responses:
 *       200:
 *         description: Sensor deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sensor deleted successfully
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized (not owner or admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Sensor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id',
  requireAuth,
  requireOwnerOrAdmin(getSensorById),
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
