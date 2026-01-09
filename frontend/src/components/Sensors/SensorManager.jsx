import { useState, useEffect } from 'react';
import api from '../../api/client';
import styles from './SensorManager.module.css';

export default function SensorManager() {
  const [sensors, setSensors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'temperature',
    location: '',
    is_public: false,
    status: 'active'
  });

  useEffect(() => {
    fetchSensors();
  }, []);

  const fetchSensors = async () => {
    try {
      const { data } = await api.get('/sensors/mine');
      setSensors(data.sensors);
    } catch (err) {
      console.error('Failed to fetch sensors:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSensor) {
        await api.put(`/sensors/${editingSensor.id}`, formData);
      } else {
        await api.post('/sensors', formData);
      }
      fetchSensors();
      resetForm();
    } catch (err) {
      console.error('Failed to save sensor:', err);
    }
  };

  const handleEdit = (sensor) => {
    setEditingSensor(sensor);
    setFormData({
      name: sensor.name,
      type: sensor.type,
      location: sensor.location || '',
      is_public: sensor.is_public === 1,
      status: sensor.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sensor?')) return;
    try {
      await api.delete(`/sensors/${id}`);
      fetchSensors();
    } catch (err) {
      console.error('Failed to delete sensor:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'temperature',
      location: '',
      is_public: false,
      status: 'active'
    });
    setEditingSensor(null);
    setShowForm(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Sensors</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add Sensor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="label">Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Type</label>
            <select
              className="input"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
              <option value="pressure">Pressure</option>
            </select>
          </div>

          <div className="form-group">
            <label className="label">Location</label>
            <input
              type="text"
              className="input"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="label">Status</label>
            <select
              className="input"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div className={styles.checkbox}>
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
            />
            <label htmlFor="is_public">Make this sensor public</label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary">
              {editingSensor ? 'Update' : 'Create'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={styles.sensorList}>
        {sensors.length === 0 ? (
          <div className={styles.empty}>
            <p>No sensors yet. Create one to get started!</p>
          </div>
        ) : (
          sensors.map(sensor => (
            <div key={sensor.id} className={styles.sensorItem}>
              <div className={styles.sensorContent}>
                <h3>{sensor.name}</h3>
                <div className={styles.sensorDetails}>
                  <span className={styles.type}>{sensor.type}</span>
                  {sensor.location && <span className={styles.location}>{sensor.location}</span>}
                  <span className={`badge badge-${sensor.status === 'active' ? 'success' : 'warning'}`}>
                    {sensor.status}
                  </span>
                  {sensor.is_public === 1 && (
                    <span className="badge badge-success">Public</span>
                  )}
                </div>
              </div>
              <div className={styles.sensorActions}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleEdit(sensor)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(sensor.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
