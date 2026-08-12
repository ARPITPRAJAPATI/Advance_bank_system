import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected network error occurred',
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(customError);
  }
);

export default api;
