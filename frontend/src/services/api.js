import axios from 'axios';

/**
 * Enterprise Axios Client Instance
 * 
 * Concept Explanation for Learning:
 * - `baseURL`: Points to our Express backend server running on port 3000.
 * - `withCredentials: true`: CRITICAL for JWT authentication. Allows browser to automatically send and receive HTTP-Only authentication cookies (`token`).
 * - Interceptors: Standard enterprise practice for global error handling (e.g. 401 Unauthorized handling).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send cookies with cross-origin requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor for Global Error Handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardize error message extraction from backend response
    const customError = {
      message: error.response?.data?.message || error.message || 'An unexpected network error occurred',
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(customError);
  }
);

export default api;
