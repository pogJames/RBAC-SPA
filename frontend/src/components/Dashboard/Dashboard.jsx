import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSensors();
  }, [user]);

  const fetchSensors = async () => {
    try {
      const endpoint = user ? '/sensors/private' : '/sensors/public';
      const { data } = await api.get(endpoint);
      setSensors(data.sensors);
      if (data.sensors.length > 0) {
        setSelectedSensor(data.sensors[0]);
      }
    } catch (err) {
      console.error('Failed to fetch sensors:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = (readings) => {
    if (!readings || readings.length === 0) return [];
    return readings.map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      value: parseFloat(r.value)
    })).reverse();
  };

  if (loading) {
    return <div className={styles.loading}>Loading sensors...</div>;
  }

  if (sensors.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>No sensors available</h2>
        <p>There are currently no sensors to display.</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Sensor Dashboard</h1>
        <p className={styles.subtitle}>Real-time sensor monitoring</p>
      </div>

      <div className={styles.sensorGrid}>
        {sensors.map(sensor => (
          <div
            key={sensor.id}
            className={`${styles.sensorCard} ${selectedSensor?.id === sensor.id ? styles.active : ''}`}
            onClick={() => setSelectedSensor(sensor)}
          >
            <div className={styles.sensorHeader}>
              <h3>{sensor.name}</h3>
              <span className={`badge badge-${sensor.status === 'active' ? 'success' : 'warning'}`}>
                {sensor.status}
              </span>
            </div>
            <div className={styles.sensorInfo}>
              <span className={styles.type}>{sensor.type}</span>
              <span className={styles.location}>{sensor.location}</span>
            </div>
            {sensor.readings && sensor.readings.length > 0 && (
              <div className={styles.latestValue}>
                {parseFloat(sensor.readings[sensor.readings.length - 1].value).toFixed(2)}
                <span className={styles.unit}>
                  {sensor.type === 'temperature' ? '°C' :
                   sensor.type === 'humidity' ? '%' :
                   sensor.type === 'pressure' ? 'hPa' : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedSensor && selectedSensor.readings && (
        <div className={styles.chartContainer}>
          <h2>{selectedSensor.name} - Last 24 Hours</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={formatChartData(selectedSensor.readings)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
              <XAxis
                dataKey="time"
                stroke="#6c757d"
                style={{ fontSize: '0.75rem' }}
              />
              <YAxis
                stroke="#6c757d"
                style={{ fontSize: '0.75rem' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '0.5rem'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0d6efd"
                strokeWidth={2}
                dot={{ fill: '#0d6efd', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
