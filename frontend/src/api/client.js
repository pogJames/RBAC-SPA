import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true
});

// CSRF token management
let csrfToken = null;

// Fetch CSRF token on app mount
export const initializeCsrf = async () => {
  try {
    const { data } = await api.get('/auth/csrf-token');
    csrfToken = data.csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
};

// Request interceptor to add CSRF token
api.interceptors.request.use(config => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method) && csrfToken) {
    config.headers['CSRF-Token'] = csrfToken;
  }
  return config;
});

// Response interceptor to refresh CSRF on 403
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 403 && error.response?.data?.code === 'EBADCSRFTOKEN') {
      await initializeCsrf();
      error.config.headers['CSRF-Token'] = csrfToken;
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);

export default api;
