const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('guest', 'user', 'admin')) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Sensors table
db.exec(`
  CREATE TABLE IF NOT EXISTS sensors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT,
    is_public BOOLEAN DEFAULT 0,
    status TEXT CHECK(status IN ('active', 'inactive', 'maintenance')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Sensor readings table (for graph data)
db.exec(`
  CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id INTEGER NOT NULL,
    value REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
  )
`);

// Seed dummy data
function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (userCount.count === 0) {
    console.log('Seeding database...');

    // Create admin user
    const adminHash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(
      'admin', 'admin@test.com', adminHash, 'admin'
    );

    // Create regular user
    const userHash = bcrypt.hashSync('user123', 10);
    db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(
      'testuser', 'user@test.com', userHash, 'user'
    );

    // Create public sensors (for guests)
    const publicSensors = [
      { name: 'Temperature Sensor A', type: 'temperature', location: 'Building A', is_public: 1 },
      { name: 'Humidity Sensor B', type: 'humidity', location: 'Building B', is_public: 1 },
      { name: 'Pressure Sensor C', type: 'pressure', location: 'Building C', is_public: 1 }
    ];

    publicSensors.forEach(sensor => {
      const result = db.prepare('INSERT INTO sensors (user_id, name, type, location, is_public) VALUES (?, ?, ?, ?, ?)').run(
        1, sensor.name, sensor.type, sensor.location, sensor.is_public
      );

      // Generate dummy readings for the last 24 hours
      const sensorId = result.lastInsertRowid;
      for (let i = 24; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 60 * 60 * 1000).toISOString();
        let value;
        switch(sensor.type) {
          case 'temperature': value = 20 + Math.random() * 10; break;
          case 'humidity': value = 40 + Math.random() * 30; break;
          case 'pressure': value = 1000 + Math.random() * 50; break;
          default: value = Math.random() * 100;
        }
        db.prepare('INSERT INTO sensor_readings (sensor_id, value, timestamp) VALUES (?, ?, ?)').run(
          sensorId, value.toFixed(2), timestamp
        );
      }
    });

    // Create private sensors for testuser
    const privateSensors = [
      { name: 'My Temperature Sensor', type: 'temperature', location: 'Home', is_public: 0 },
      { name: 'My Humidity Sensor', type: 'humidity', location: 'Office', is_public: 0 }
    ];

    privateSensors.forEach(sensor => {
      const result = db.prepare('INSERT INTO sensors (user_id, name, type, location, is_public) VALUES (?, ?, ?, ?, ?)').run(
        2, sensor.name, sensor.type, sensor.location, sensor.is_public
      );

      const sensorId = result.lastInsertRowid;
      for (let i = 24; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 60 * 60 * 1000).toISOString();
        let value;
        switch(sensor.type) {
          case 'temperature': value = 22 + Math.random() * 8; break;
          case 'humidity': value = 50 + Math.random() * 20; break;
          default: value = Math.random() * 100;
        }
        db.prepare('INSERT INTO sensor_readings (sensor_id, value, timestamp) VALUES (?, ?, ?)').run(
          sensorId, value.toFixed(2), timestamp
        );
      }
    });

    console.log('Database seeded successfully');
  }
}

seedDatabase();

module.exports = db;
