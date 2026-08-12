import api from './api';

export const createTransactionApi = async ({ fromAccount, toAccount, amount, description }) => {
  const response = await api.post('/transaction/', {
    fromAccount,
    toAccount,
    amount: Number(amount),
    description,
  });
  return response.data;
};

export const getUserTransactionsApi = async () => {
  const response = await api.get('/transaction/my-transactions');
  return response.data;
};

export const createInitialFundsApi = async ({ toAccount, amount }) => {
  const response = await api.post('/transaction/system/initial-funds', {
    toAccount,
    amount: Number(amount),
  });
  return response.data;
};
