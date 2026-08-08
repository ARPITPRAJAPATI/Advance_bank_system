import api from './api';

/**
 * Authentication API Service
 * 
 * Maps directly to Express Backend Auth Routes (`src/routes/auth.route.js`)
 */

// POST /api/auth/register
export const registerApi = async ({ email, password, name }) => {
  const response = await api.post('/auth/register', { email, password, name });
  return response.data; // returns { message, user: { _id, email, name, systemUser } }
};

// POST /api/auth/login
export const loginApi = async ({ email, password }) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data; // returns { message, user: { _id, email, name, systemUser } }
};

// POST /api/auth/logout
export const logoutApi = async () => {
  const response = await api.post('/auth/logout');
  return response.data; // returns { message: "user logged out" }
};
