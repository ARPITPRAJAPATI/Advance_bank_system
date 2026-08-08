import api from './api';

/**
 * Transaction API Service
 * 
 * Maps directly to Express Backend Transaction Routes (`src/routes/transaction.route.js`)
 */

// POST /api/transaction/ (Transfer funds between accounts)
export const createTransactionApi = async ({ fromAccount, toAccount, amount, description }) => {
  const response = await api.post('/transaction/', {
    fromAccount,
    toAccount,
    amount: Number(amount),
    description,
  });
  return response.data;
};

// GET /api/transaction/my-transactions (Fetch transaction history ledger)
export const getUserTransactionsApi = async () => {
  const response = await api.get('/transaction/my-transactions');
  return response.data; // returns { status: "success", transactions: [...] }
};

// POST /api/transaction/system/initial-funds (System admin initial funding)
export const createInitialFundsApi = async ({ toAccount, amount }) => {
  const response = await api.post('/transaction/system/initial-funds', {
    toAccount,
    amount: Number(amount),
  });
  return response.data;
};
