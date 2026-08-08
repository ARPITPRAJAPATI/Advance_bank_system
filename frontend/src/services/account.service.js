import api from './api';

/**
 * Account API Service
 * 
 * Maps directly to Express Backend Account Routes (`src/routes/account.route.js`)
 */

// POST /api/account/ (Create new bank account)
export const createAccountApi = async () => {
  const response = await api.post('/account/');
  return response.data;
};

// GET /api/account/ (Get all bank accounts belonging to logged-in user)
export const getUserAccountsApi = async () => {
  const response = await api.get('/account/');
  return response.data; // returns { status: "success", accounts: [...] }
};

// GET /api/account/balance/:accountId (Get real-time ledger balance for specific account)
export const getAccountBalanceApi = async (accountId) => {
  const response = await api.get(`/account/balance/${accountId}`);
  return response.data; // returns { status: "success", balance: N }
};
