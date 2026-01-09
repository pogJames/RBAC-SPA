import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function ApiInterceptor() {
  const navigate = useNavigate();
  const { user, handleSessionExpired } = useAuth();
  const { addNotification } = useNotification();
  const hasNotified = useRef(false);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Only handle if it's not a login/register attempt and not /auth/me check
          const isAuthCheck = error.config.url === '/auth/me';
          const isLoginAttempt = error.config.url === '/auth/login' || error.config.url === '/auth/register';

          if (!isAuthCheck && !isLoginAttempt && user && !hasNotified.current) {
            hasNotified.current = true;
            handleSessionExpired();
            addNotification('Your session has expired. Please log in again.', 'warning');
            navigate('/', { replace: true });

            // Reset after a delay to allow future sessions
            setTimeout(() => {
              hasNotified.current = false;
            }, 3000);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [navigate, user, handleSessionExpired, addNotification]);

  return null;
}
