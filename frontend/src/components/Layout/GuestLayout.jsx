import { Link } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import styles from './Layout.module.css';

export default function GuestLayout({ children }) {
  return (
    <div className={styles.guestLayout}>
      <header className={styles.guestHeader}>
        <div className={styles.logo}>Sensor Dashboard</div>
        <div className={styles.headerActions}>
          <ThemeToggle />
          <Link to="/login" className="btn btn-secondary">Login</Link>
          <Link to="/register" className="btn btn-primary">Register</Link>
        </div>
      </header>
      <aside className={styles.sidebar}>
        <div className={styles.guestSidebarContent}>
          <h3>Guest Mode</h3>
          <p className={styles.guestInfo}>
            You're viewing public sensors. Login to access more features.
          </p>
        </div>
      </aside>
      <main className={styles.guestMain}>
        {children}
      </main>
    </div>
  );
}
