import { useState, useEffect } from 'react';
import api from '../../api/client';
import styles from './Admin.module.css';

export default function SensorAdmin() {
  const [sensors, setSensors] = useState([]);
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
      const { data } = await api.get('/admin/sensors');
      setSensors(data.sensors);
    } catch (err) {
      console.error('Failed to fetch sensors:', err);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/sensors/${editingSensor.id}`, formData);
      fetchSensors();
      setEditingSensor(null);
    } catch (err) {
      console.error('Failed to update sensor:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sensor?')) return;
    try {
      await api.delete(`/admin/sensors/${id}`);
      fetchSensors();
    } catch (err) {
      console.error('Failed to delete sensor:', err);
    }
  };

  return (
    <div className={styles.container}>
      <h1>All Sensors</h1>

      {editingSensor && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2>Edit Sensor</h2>
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
            <label htmlFor="is_public">Public</label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary">Update</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingSensor(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Owner</th>
              <th>Location</th>
              <th>Status</th>
              <th>Public</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sensors.map(sensor => (
              <tr key={sensor.id}>
                <td>{sensor.name}</td>
                <td className={styles.capitalize}>{sensor.type}</td>
                <td>{sensor.username}</td>
                <td>{sensor.location || '-'}</td>
                <td>
                  <span className={`badge badge-${sensor.status === 'active' ? 'success' : 'warning'}`}>
                    {sensor.status}
                  </span>
                </td>
                <td>{sensor.is_public ? 'Yes' : 'No'}</td>
                <td>
                  <div className={styles.actions}>
                    <button className="btn btn-secondary" onClick={() => handleEdit(sensor)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(sensor.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
