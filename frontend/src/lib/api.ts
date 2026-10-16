import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const activeStudentId = localStorage.getItem('active_profile_id') || localStorage.getItem('active_student_id') || '';
  if (activeStudentId) {
    config.headers['X-Student-Id'] = activeStudentId;
  }
  return config;
});

export default apiClient;

