import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import styles from './Layout.module.css';

export default function UserLayout({ children }) {
  const { user, logout } = useAuth();
  const { addNotification } = useNotification();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    addNotification('Logged out successfully', 'info');
  };

  return (
    <div className={styles.userLayout}>
      <header className={styles.userHeader}>
        <div className={styles.logo}>Sensor Dashboard</div>
        <div className={styles.headerActions}>
          <ThemeToggle />
          <span>{user?.username}</span>
          <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <div className={styles.userInfo}>
          <div className={styles.username}>{user?.username}</div>
          <div className={styles.role}>
            <span className={`badge ${user?.role === 'admin' ? 'badge-danger' : 'badge-success'}`}>
              {user?.role}
            </span>
          </div>
        </div>

        <nav>
          <ul className={styles.nav}>
            <li className={styles.navItem}>
              <Link
                to="/dashboard"
                className={`${styles.navLink} ${isActive('/dashboard') ? styles.active : ''}`}
              >
                Dashboard
              </Link>
            </li>
            <li className={styles.navItem}>
              <Link
                to="/sensors"
                className={`${styles.navLink} ${isActive('/sensors') ? styles.active : ''}`}
              >
                My Sensors
              </Link>
            </li>
            {user?.role === 'admin' && (
              <>
                <li className={styles.navItem}>
                  <Link
                    to="/admin/users"
                    className={`${styles.navLink} ${isActive('/admin/users') ? styles.active : ''}`}
                  >
                    Manage Users
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <Link
                    to="/admin/sensors"
                    className={`${styles.navLink} ${isActive('/admin/sensors') ? styles.active : ''}`}
                  >
                    All Sensors
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </aside>

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
