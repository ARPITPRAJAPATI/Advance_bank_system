import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  createAccountApi, 
  getUserAccountsApi, 
  getAccountBalanceApi 
} from '../services/account.service';
import { 
  createTransactionApi, 
  getUserTransactionsApi, 
  createInitialFundsApi 
} from '../services/transaction.service';
import { 
  CreditCard, 
  Send, 
  PlusCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  LogOut, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Shield, 
  Wallet,
  DollarSign
} from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  // State
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [transactions, setTransactions] = useState([]);
  
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isRefreshingTxns, setIsRefreshingTxns] = useState(false);
  
  // Transfer Form State
  const [transferData, setTransferData] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
  });
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Initial Funds Deposit Form State
  const [depositData, setDepositData] = useState({
    toAccount: '',
    amount: '',
  });
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMessage, setDepositMessage] = useState(null);

  // Copied Account ID feedback
  const [copiedId, setCopiedId] = useState('');

  // 1. Fetch User Accounts
  const fetchAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const data = await getUserAccountsApi();
      const userAccounts = data.accounts || [];
      setAccounts(userAccounts);

      // Auto set default selected fromAccount in transfer form
      if (userAccounts.length > 0) {
        setTransferData((prev) => ({
          ...prev,
          fromAccount: prev.fromAccount || userAccounts[0]._id,
        }));
        setDepositData((prev) => ({
          ...prev,
          toAccount: prev.toAccount || userAccounts[0]._id,
        }));
      }

      // Fetch balances for each account
      userAccounts.forEach((acc) => {
        fetchAccountBalance(acc._id);
      });
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  // 2. Fetch specific account balance
  const fetchAccountBalance = async (accountId) => {
    try {
      const res = await getAccountBalanceApi(accountId);
      setBalances((prev) => ({
        ...prev,
        [accountId]: res.balance,
      }));
    } catch (err) {
      console.error(`Failed to load balance for account ${accountId}:`, err);
    }
  };

  // 3. Fetch Transaction History
  const fetchTransactions = async () => {
    setIsRefreshingTxns(true);
    try {
      const data = await getUserTransactionsApi();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setIsRefreshingTxns(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, []);

  // Handler: Create New Bank Account
  const handleCreateAccount = async () => {
    setIsCreatingAccount(true);
    try {
      await createAccountApi();
      await fetchAccounts();
    } catch (err) {
      alert('Failed to create account: ' + (err.message || 'Error occurred'));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Handler: Copy Account ID
  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  // Handler: Perform Money Transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferData.fromAccount || !transferData.toAccount || !transferData.amount) {
      setTransferMessage({ type: 'error', text: 'Please fill in all transfer fields.' });
      return;
    }

    if (transferData.fromAccount === transferData.toAccount) {
      setTransferMessage({ type: 'error', text: 'Sender and receiver account cannot be the same.' });
      return;
    }

    setTransferLoading(true);
    setTransferMessage(null);

    try {
      const res = await createTransactionApi({
        fromAccount: transferData.fromAccount,
        toAccount: transferData.toAccount.trim(),
        amount: transferData.amount,
      });

      setTransferMessage({
        type: 'success',
        text: res.message || 'Transfer completed successfully!',
      });

      // Clear amount input
      setTransferData((prev) => ({ ...prev, amount: '' }));

      // Refresh accounts, balances & transactions
      await fetchAccounts();
      await fetchTransactions();
    } catch (err) {
      setTransferMessage({
        type: 'error',
        text: err.message || 'Transfer failed. Please check the receiver ID and your balance.',
      });
    } finally {
      setTransferLoading(false);
    }
  };

  // Handler: Deposit Initial Funds
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositData.toAccount || !depositData.amount) {
      setDepositMessage({ type: 'error', text: 'Please select an account and amount.' });
      return;
    }

    setDepositLoading(true);
    setDepositMessage(null);

    try {
      const res = await createInitialFundsApi({
        toAccount: depositData.toAccount.trim(),
        amount: depositData.amount,
      });

      setDepositMessage({
        type: 'success',
        text: res.message || 'Initial funds deposited successfully!',
      });

      setDepositData((prev) => ({ ...prev, amount: '' }));

      await fetchAccounts();
      await fetchTransactions();
    } catch (err) {
      setDepositMessage({
        type: 'error',
        text: err.message || 'Deposit failed. Ensure you have system user privileges or check server configuration.',
      });
    } finally {
      setDepositLoading(false);
    }
  };

  // Helper to determine if an account ID belongs to the current user
  const isMyAccount = (accId) => {
    if (!accId) return false;
    const cleanId = typeof accId === 'object' ? accId._id : accId;
    return accounts.some((a) => a._id === cleanId);
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-100 font-sans pb-16">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#12161F]/90 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white font-bold">
              ✦
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                navya<span className="text-slate-400 font-light">Pay</span>
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                Banking Dashboard
              </span>
            </div>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white flex items-center gap-2 justify-end">
                <span>{user?.name || 'User'}</span>
                {user?.systemUser && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    System User
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">{user?.email}</div>
            </div>

            <button
              onClick={logout}
              className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* 1. ACCOUNTS OVERVIEW SECTION */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet size={20} className="text-slate-400" />
                <span>My Bank Accounts</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your accounts, copy your account number, and check balances
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchAccounts}
                disabled={isLoadingAccounts}
                className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoadingAccounts ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleCreateAccount}
                disabled={isCreatingAccount}
                className="px-4 py-2 rounded-xl bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-white/5"
              >
                <PlusCircle size={15} />
                <span>{isCreatingAccount ? 'Creating...' : 'Open New Account'}</span>
              </button>
            </div>
          </div>

          {/* Accounts Grid */}
          {accounts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#12161F] border border-white/10 text-center space-y-3">
              <CreditCard size={36} className="mx-auto text-slate-500" />
              <p className="text-sm text-slate-300 font-medium">You don't have any bank accounts yet.</p>
              <p className="text-xs text-slate-500">Click "Open New Account" above to create your first bank account.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc, index) => {
                const balance = balances[acc._id];
                return (
                  <div 
                    key={acc._id}
                    className="p-5 rounded-2xl bg-[#12161F] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4 shadow-lg"
                  >
                    {/* Top Row: Account Index & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">Account #{index + 1}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase">
                          {acc.status || 'ACTIVE'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">navyaPay</span>
                    </div>

                    {/* Balance Display */}
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">Current Balance</span>
                      <div className="text-2xl font-extrabold text-white mt-0.5 flex items-center justify-between">
                        <span>₹ {balance !== undefined ? balance.toLocaleString() : '...'}</span>
                        <button
                          onClick={() => fetchAccountBalance(acc._id)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all text-xs"
                          title="Refresh balance"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Account ID with Copy Button */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <div className="truncate max-w-[200px]">
                        <span className="text-[10px] text-slate-500 block">ACCOUNT ID</span>
                        <span className="font-mono text-slate-300 text-[11px] select-all">{acc._id}</span>
                      </div>
                      <button
                        onClick={() => handleCopyId(acc._id)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copiedId === acc._id ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400 font-medium text-[11px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. TRANSACTION ACTIONS SECTION (Transfer Money & Initial Deposit) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Transfer Money Card */}
          <div className="p-6 rounded-2xl bg-[#12161F] border border-white/10 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Send size={18} className="text-emerald-400" />
                <span>Transfer Money</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Send funds instantly to any account using its Account ID
              </p>
            </div>

            {/* Transfer Message Alert */}
            {transferMessage && (
              <div 
                className={`p-3 rounded-xl text-xs font-medium border ${
                  transferMessage.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {transferMessage.text}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              {/* From Account Dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">From Account</label>
                <select
                  value={transferData.fromAccount}
                  onChange={(e) => setTransferData({ ...transferData, fromAccount: e.target.value })}
                  required
                  className="w-full bg-slate-950/60 text-white text-xs rounded-xl py-3 px-3 border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
                >
                  {accounts.map((acc, idx) => (
                    <option key={acc._id} value={acc._id}>
                      Account #{idx + 1} ({acc._id}) — ₹ {balances[acc._id] !== undefined ? balances[acc._id] : '0'}
                    </option>
                  ))}
                </select>
              </div>

              {/* To Account ID Input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">To Account ID (Receiver)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 64b8f72c91234..."
                  value={transferData.toAccount}
                  onChange={(e) => setTransferData({ ...transferData, toAccount: e.target.value })}
                  className="w-full bg-slate-950/60 text-white placeholder-slate-500 text-xs rounded-xl py-3 px-3 border border-white/10 focus:border-white/30 focus:outline-none font-mono"
                />
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Amount (₹)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="500"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                    className="w-full bg-slate-950/60 text-white placeholder-slate-500 text-sm rounded-xl py-3 pl-8 pr-4 border border-white/10 focus:border-white/30 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={transferLoading || accounts.length === 0}
                className="w-full py-3 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-white/5"
              >
                {transferLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing Atomic Transfer...</span>
                  </>
                ) : (
                  <>
                    <span>Send Money</span>
                    <ArrowUpRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Initial Deposit / Funding Card */}
          <div className="p-6 rounded-2xl bg-[#12161F] border border-white/10 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign size={18} className="text-amber-400" />
                <span>Deposit / Initial Funds</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Fund any bank account with initial starting balance for testing
              </p>
            </div>

            {/* Deposit Message Alert */}
            {depositMessage && (
              <div 
                className={`p-3 rounded-xl text-xs font-medium border ${
                  depositMessage.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {depositMessage.text}
              </div>
            )}

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              {/* Target Account Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Deposit To Account</label>
                <select
                  value={depositData.toAccount}
                  onChange={(e) => setDepositData({ ...depositData, toAccount: e.target.value })}
                  required
                  className="w-full bg-slate-950/60 text-white text-xs rounded-xl py-3 px-3 border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
                >
                  {accounts.map((acc, idx) => (
                    <option key={acc._id} value={acc._id}>
                      Account #{idx + 1} ({acc._id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Deposit Amount (₹)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="1000"
                    value={depositData.amount}
                    onChange={(e) => setDepositData({ ...depositData, amount: e.target.value })}
                    className="w-full bg-slate-950/60 text-white placeholder-slate-500 text-sm rounded-xl py-3 pl-8 pr-4 border border-white/10 focus:border-white/30 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={depositLoading || accounts.length === 0}
                  className="w-full py-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {depositLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Depositing Funds...</span>
                    </>
                  ) : (
                    <>
                      <span>Deposit Initial Funds</span>
                      <ArrowDownLeft size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* 3. TRANSACTION HISTORY / LEDGER TABLE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield size={20} className="text-slate-400" />
                <span>Transaction History</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit ledger of all credits and debits linked to your accounts
              </p>
            </div>

            <button
              onClick={fetchTransactions}
              disabled={isRefreshingTxns}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRefreshingTxns ? 'animate-spin' : ''} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {/* Transactions List */}
          <div className="bg-[#12161F] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No transactions recorded yet. Transfer funds or make a deposit to see ledger entries.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">From Account</th>
                      <th className="py-3.5 px-4">To Account</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {transactions.map((txn) => {
                      const fromId = typeof txn.fromAccount === 'object' ? txn.fromAccount?._id : txn.fromAccount;
                      const toId = typeof txn.toAccount === 'object' ? txn.toAccount?._id : txn.toAccount;
                      
                      const isCredit = isMyAccount(toId);
                      const isDebit = isMyAccount(fromId);

                      return (
                        <tr key={txn._id} className="hover:bg-white/[0.02] transition-colors">
                          
                          {/* Type Badge */}
                          <td className="py-3.5 px-4">
                            {isCredit && !isDebit ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                                <ArrowDownLeft size={12} />
                                CREDIT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-[10px]">
                                <ArrowUpRight size={12} />
                                DEBIT
                              </span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-bold text-sm">
                            <span className={isCredit && !isDebit ? 'text-emerald-400' : 'text-slate-200'}>
                              {isCredit && !isDebit ? '+' : '-'} ₹ {txn.amount?.toLocaleString()}
                            </span>
                          </td>

                          {/* From Account */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                            <span className={isMyAccount(fromId) ? 'text-white font-medium' : ''}>
                              {fromId || 'System'}
                            </span>
                          </td>

                          {/* To Account */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                            <span className={isMyAccount(toId) ? 'text-white font-medium' : ''}>
                              {toId || 'Unknown'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-slate-300">
                              {txn.status || 'COMPLETED'}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {txn.createdAt ? new Date(txn.createdAt).toLocaleString() : 'Recent'}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
