const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const config = require('../config');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin role
router.use(requireAdmin);

// GET /api/admin/users - Get all users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, role, created_at FROM users').all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, password } = req.body;

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);
      db.prepare('UPDATE users SET username = ?, email = ?, role = ?, password = ? WHERE id = ?').run(
        username, email, role, hashedPassword, id
      );
    } else {
      db.prepare('UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?').run(
        username, email, role, id
      );
    }

    const updated = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(id);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/sensors - Get all sensors
router.get('/sensors', (req, res) => {
  try {
    const sensors = db.prepare(`
      SELECT s.*, u.username
      FROM sensors s
      LEFT JOIN users u ON s.user_id = u.id
    `).all();
    res.json({ sensors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/sensors/:id - Update any sensor
router.put('/sensors/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, location, is_public, status } = req.body;

    const sensor = db.prepare('SELECT id FROM sensors WHERE id = ?').get(id);
    if (!sensor) {
      return res.status(404).json({ error: 'Sensor not found' });
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

// DELETE /api/admin/sensors/:id - Delete any sensor
router.delete('/sensors/:id', (req, res) => {
  try {
    const { id } = req.params;

    const sensor = db.prepare('SELECT id FROM sensors WHERE id = ?').get(id);
    if (!sensor) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    db.prepare('DELETE FROM sensors WHERE id = ?').run(id);
    res.json({ message: 'Sensor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
