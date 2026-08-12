import api from './api';

export const createAccountApi = async () => {
  const response = await api.post('/account/');
  return response.data;
};

export const getUserAccountsApi = async () => {
  const response = await api.get('/account/');
  return response.data;
};

export const getAccountBalanceApi = async (accountId) => {
  const response = await api.get(`/account/balance/${accountId}`);
  return response.data;
};
