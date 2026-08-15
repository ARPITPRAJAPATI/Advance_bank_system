import api from './api';

// Helper to generate a unique idempotency key
const generateIdempotencyKey = () => {
  return 'txn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
};

export const createTransactionApi = async ({ fromAccount, toAccount, amount, idempotencyKey }) => {
  const key = idempotencyKey || generateIdempotencyKey();
  const response = await api.post('/transaction/', {
    fromAccount,
    toAccount,
    amount: Number(amount),
    idempotencyKey: key,
  });
  return response.data;
};

export const getUserTransactionsApi = async () => {
  const response = await api.get('/transaction/my-transactions');
  return response.data;
};

export const createInitialFundsApi = async ({ toAccount, amount, idempotencyKey }) => {
  const key = idempotencyKey || generateIdempotencyKey();
  const response = await api.post('/transaction/system/initial-funds', {
    toAccount,
    amount: Number(amount),
    idempotencyKey: key,
  });
  return response.data;
};
