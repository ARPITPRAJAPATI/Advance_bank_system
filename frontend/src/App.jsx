import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Wallet, 
  ArrowRightLeft, 
  History, 
  Coins, 
  User, 
  LogOut, 
  Plus, 
  Copy, 
  Check, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp, 
  Info,
  DollarSign,
  AlertTriangle,
  Lock,
  Mail,
  UserCheck
} from 'lucide-react';
import './App.css';

const API_BASE = "http://localhost:8080/api";

function App() {
  // Auth state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bank_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('bank_token') || '');
  const [authMode, setAuthMode] = useState('login');
  
  // Dashboard & Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [transactions, setTransactions] = useState([]);
  
  // Form states
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [transferForm, setTransferForm] = useState({ 
    fromAccount: '', 
    toAccount: '', 
    amount: '', 
    idempotencyKey: '' 
  });
  const [depositForm, setDepositForm] = useState({ 
    toAccount: '', 
    amount: '', 
    idempotencyKey: '' 
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [copiedId, setCopiedId] = useState('');
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Helper to generate UUID for Idempotency Key
  const generateUUID = () => {
    return 'idx_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Setup initial forms
  useEffect(() => {
    setTransferForm(prev => ({ ...prev, idempotencyKey: generateUUID() }));
    setDepositForm(prev => ({ ...prev, idempotencyKey: generateUUID() }));
  }, []);

  // Fetch dashboard data when user is authenticated
  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchTransactions();
    }
  }, [user]);

  // Request helper
  const makeRequest = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };

    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
      credentials: 'include' // Allow sending cookies
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  };

  const fetchAccounts = async () => {
    try {
      const data = await makeRequest('/accounts');
      setAccounts(data.accounts || []);
      
      // Auto select first account for transfer if not set
      if (data.accounts?.length > 0) {
        setTransferForm(prev => ({ ...prev, fromAccount: data.accounts[0]._id }));
      }

      // Fetch balances
      data.accounts.forEach(acc => {
        fetchAccountBalance(acc._id);
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const fetchAccountBalance = async (accountId) => {
    try {
      const data = await makeRequest(`/accounts/balance/${accountId}`);
      setBalances(prev => ({ ...prev, [accountId]: data.balance }));
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await makeRequest('/transaction/my-transactions');
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Transactions fetch error:", err);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data;
      if (authMode === 'login') {
        data = await makeRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: authForm.email, password: authForm.password })
        });
      } else {
        data = await makeRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify(authForm)
        });
      }
      
      // Extract token from cookie or header (if returned in payload or cookie is set)
      // Node backend sets cookie "token" and returns user details.
      // We will save user and show success toast.
      const loggedUser = data.user;
      setUser(loggedUser);
      localStorage.setItem('bank_user', JSON.stringify(loggedUser));
      
      // We also store token if it exists in response or cookies
      showToast(`Welcome back, ${loggedUser.name}!`, 'success');
      setActiveTab('dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await makeRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn("Logout endpoint error:", err);
    }
    setUser(null);
    setToken('');
    setAccounts([]);
    setBalances({});
    setTransactions([]);
    localStorage.removeItem('bank_user');
    localStorage.removeItem('bank_token');
    showToast("Logged out successfully", "info");
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      const data = await makeRequest('/accounts', { method: 'POST' });
      showToast("Bank Account Created Successfully!", 'success');
      fetchAccounts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.fromAccount || !transferForm.toAccount || !transferForm.amount) {
      showToast("Please fill all transfer details", "error");
      return;
    }

    setLoading(true);
    setTransferProgress(10);
    
    // Simulate transaction progress matching the backend 15s delay
    const interval = setInterval(() => {
      setTransferProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 800);

    try {
      const data = await makeRequest('/transaction', {
        method: 'POST',
        body: JSON.stringify({
          fromAccount: transferForm.fromAccount,
          toAccount: transferForm.toAccount,
          amount: parseFloat(transferForm.amount),
          idempotencyKey: transferForm.idempotencyKey
        })
      });

      clearInterval(interval);
      setTransferProgress(100);
      showToast("Transfer completed successfully!", 'success');
      
      // Reset transfer form with new idempotency key
      setTransferForm(prev => ({
        ...prev,
        amount: '',
        idempotencyKey: generateUUID()
      }));

      // Refresh accounts & ledger
      setTimeout(() => {
        fetchAccounts();
        fetchTransactions();
        setTransferProgress(0);
        setLoading(false);
      }, 1000);

    } catch (err) {
      clearInterval(interval);
      setTransferProgress(0);
      setLoading(false);
      showToast(err.message, 'error');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositForm.toAccount || !depositForm.amount) {
      showToast("Please enter destination account and amount", "error");
      return;
    }

    setLoading(true);
    try {
      const data = await makeRequest('/transaction/system/initial-funds', {
        method: 'POST',
        body: JSON.stringify({
          toAccount: depositForm.toAccount,
          amount: parseFloat(depositForm.amount),
          idempotencyKey: depositForm.idempotencyKey
        })
      });

      showToast("Initial funds deposited successfully!", 'success');
      setDepositForm(prev => ({
        ...prev,
        amount: '',
        idempotencyKey: generateUUID()
      }));

      fetchAccounts();
      fetchTransactions();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    showToast(`${label} copied to clipboard`, 'success');
    setTimeout(() => setCopiedId(''), 2000);
  };

  // Calculate total balance
  const getTotalBalance = () => {
    return Object.values(balances).reduce((sum, bal) => sum + bal, 0);
  };

  if (!user) {
    return (
      <div className="auth-container animate-fade-in">
        <style dangerouslySetInnerHTML={{__html: `
          .auth-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .auth-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-xl);
            width: 100%;
            max-width: 440px;
            padding: 40px;
            backdrop-filter: blur(20px);
            box-shadow: var(--shadow-lg);
          }
          .auth-header {
            text-align: center;
            margin-bottom: 32px;
          }
          .auth-logo {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
            border-radius: var(--radius-md);
            background: var(--primary-light);
            color: var(--primary);
            margin-bottom: 16px;
          }
          .auth-title {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
          }
          .auth-subtitle {
            color: var(--text-secondary);
            font-size: 14px;
          }
          .auth-tabs {
            display: flex;
            background: rgba(255, 255, 255, 0.03);
            padding: 4px;
            border-radius: var(--radius-md);
            margin-bottom: 24px;
            border: 1px solid var(--border-color);
          }
          .auth-tab {
            flex: 1;
            padding: 10px;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-weight: 500;
            font-size: 14px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .auth-tab.active {
            background: var(--primary);
            color: white;
            box-shadow: var(--shadow-sm);
          }
          .form-group {
            margin-bottom: 20px;
            position: relative;
          }
          .form-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            margin-bottom: 8px;
          }
          .input-wrapper {
            position: relative;
          }
          .input-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            width: 18px;
            height: 18px;
          }
          .auth-input {
            width: 100%;
            padding: 12px 14px 12px 42px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-size: 15px;
            transition: all 0.2s ease;
          }
          .auth-input:focus {
            outline: none;
            border-color: var(--border-focus);
            background: rgba(255, 255, 255, 0.04);
            box-shadow: var(--shadow-glow);
          }
          .submit-btn {
            width: 100%;
            padding: 14px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: var(--radius-md);
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .submit-btn:hover:not(:disabled) {
            background: var(--primary-hover);
          }
          .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}} />
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <Building2 size={32} />
            </div>
            <h2 className="auth-title">Calotes Trust</h2>
            <p className="auth-subtitle">Production-Grade Atomic Transaction Platform</p>
          </div>
          
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Sign In
            </button>
            <button 
              className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-wrapper">
                  <UserCheck className="input-icon" />
                  <input 
                    type="text" 
                    placeholder="Enter your name" 
                    className="auth-input"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  className="auth-input"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="auth-input"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : authMode === 'login' ? 'Sign In Securely' : 'Create Bank Profile'}
            </button>
          </form>
        </div>

        {toast && (
          <div className={`toast ${toast.type}`}>
            <Info size={18} />
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-layout animate-fade-in">
      <style dangerouslySetInnerHTML={{__html: `
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
        }
        .sidebar {
          width: 260px;
          background: rgba(17, 24, 39, 0.85);
          border-right: 1px solid var(--border-color);
          padding: 24px;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(10px);
          position: fixed;
          height: 100vh;
        }
        .main-content {
          margin-left: 260px;
          flex: 1;
          padding: 40px;
          overflow-y: auto;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 40px;
        }
        .brand-icon {
          color: var(--primary);
        }
        .nav-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: auto;
        }
        .nav-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
          text-align: left;
        }
        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }
        .nav-btn.active {
          background: var(--primary-light);
          color: var(--primary);
        }
        .user-section {
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .user-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-width: 150px;
        }
        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-role {
          font-size: 11px;
          color: var(--emerald);
          font-weight: 600;
          text-transform: uppercase;
        }
        .logout-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.2s ease;
          padding: 8px;
          border-radius: var(--radius-sm);
        }
        .logout-btn:hover {
          color: var(--rose);
          background: var(--rose-light);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }
        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 24px;
          backdrop-filter: blur(10px);
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--primary);
        }
        .stat-card.emerald::before { background: var(--emerald); }
        .stat-card.rose::before { background: var(--rose); }
        .stat-label {
          font-size: 13px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .stat-subtext {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }
        .bank-card {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xl);
          padding: 24px;
          position: relative;
          height: 200px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .bank-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px rgba(0, 0, 0, 0.3);
        }
        .bank-card.frozen {
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
        }
        .card-chip {
          width: 42px;
          height: 30px;
          background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
          border-radius: var(--radius-sm);
          opacity: 0.85;
        }
        .card-number {
          font-family: var(--mono);
          font-size: 18px;
          letter-spacing: 2px;
          color: white;
          margin-top: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .card-balance-lbl {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
        }
        .card-balance-val {
          font-size: 24px;
          font-weight: 700;
          color: white;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .card-holder {
          display: flex;
          flex-direction: column;
        }
        .card-holder-lbl {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }
        .card-holder-name {
          font-size: 14px;
          font-weight: 600;
          color: white;
        }
        .card-status {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.2);
          color: var(--emerald);
          text-transform: uppercase;
        }
        .card-status.frozen {
          background: rgba(245, 158, 11, 0.2);
          color: var(--yellow);
        }
        .btn-primary {
          background: var(--primary);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-primary:hover {
          background: var(--primary-hover);
        }
        .btn-outline {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 12px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: var(--text-secondary);
        }
        .panel {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 32px;
          backdrop-filter: blur(10px);
          margin-bottom: 32px;
        }
        .panel-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 24px;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bank-form {
          max-width: 520px;
        }
        .idempotency-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--primary-light);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #a5b4fc;
          font-size: 11px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          margin-top: 8px;
        }
        .progress-bar-container {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 9999px;
          height: 6px;
          overflow: hidden;
          margin-top: 16px;
          margin-bottom: 8px;
        }
        .progress-bar-fill {
          height: 100%;
          background: var(--primary);
          transition: width 0.3s ease;
        }
        .progress-bar-lbl {
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          justify-content: space-between;
        }
        .ledger-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }
        .ledger-table th {
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-secondary);
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          letter-spacing: 0.05em;
        }
        .ledger-table td {
          padding: 16px;
          font-size: 14px;
          color: var(--text-primary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }
        .ledger-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }
        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 13px;
        }
        .type-badge.credit { color: var(--emerald); }
        .type-badge.debit { color: var(--rose); }
        .status-badge {
          display: inline-flex;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .status-badge.completed { background: var(--emerald-light); color: var(--emerald); }
        .status-badge.pending { background: var(--yellow-light); color: var(--yellow); }
        .status-badge.failed { background: var(--rose-light); color: var(--rose); }
      `}} />

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <Building2 className="brand-icon" size={28} />
          <span>Calotes Trust</span>
        </div>

        <ul className="nav-list">
          <li>
            <button 
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Wallet size={18} />
              <span>Overview</span>
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              <Building2 size={18} />
              <span>My Accounts</span>
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer')}
            >
              <ArrowRightLeft size={18} />
              <span>Transfer Funds</span>
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'ledger' ? 'active' : ''}`}
              onClick={() => setActiveTab('ledger')}
            >
              <History size={18} />
              <span>Statement History</span>
            </button>
          </li>
          <li>
            <button 
              className={`nav-btn ${activeTab === 'deposit' ? 'active' : ''}`}
              onClick={() => setActiveTab('deposit')}
            >
              <Coins size={18} />
              <span>Simulation Deposit</span>
            </button>
          </li>
        </ul>

        <div className="user-section">
          <div className="user-details">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.systemUser ? 'System Admin' : 'Active Account'}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <div className="tab-panel">
            <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Dashboard Overview</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
              Welcome back to your atomic banking portal.
            </p>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Asset Value</div>
                <div className="stat-value">₹ {getTotalBalance().toLocaleString('en-IN')}</div>
                <div className="stat-subtext">Aggregated across all verified active accounts</div>
              </div>
              <div className="stat-card emerald">
                <div className="stat-label">Active Accounts</div>
                <div className="stat-value">{accounts.length}</div>
                <div className="stat-subtext">Secured double-entry ledgers</div>
              </div>
              <div className="stat-card rose">
                <div className="stat-label">Recent Transactions</div>
                <div className="stat-value">{transactions.length}</div>
                <div className="stat-subtext">Ledger records processed</div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={20} className="brand-icon" />
                  <span>Your Accounts</span>
                </div>
                <button className="btn-primary" onClick={handleCreateAccount} disabled={loading}>
                  <Plus size={16} /> Create Account
                </button>
              </div>

              {accounts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <p style={{ marginBottom: '16px' }}>No active bank accounts found. Create one to get started.</p>
                </div>
              ) : (
                <div className="card-grid">
                  {accounts.map(acc => (
                    <div className={`bank-card ${acc.status !== 'ACTIVE' ? 'frozen' : ''}`} key={acc._id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="card-chip"></div>
                        <div className="card-status">{acc.status}</div>
                      </div>
                      
                      <div className="card-number">
                        {acc._id}
                        <button 
                          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                          onClick={() => copyToClipboard(acc._id, 'Account ID')}
                        >
                          {copiedId === acc._id ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div className="card-footer">
                        <div className="card-holder">
                          <span className="card-holder-lbl">Balance</span>
                          <span className="card-balance-val">
                            ₹ {(balances[acc._id] !== undefined ? balances[acc._id] : 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <button 
                          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}
                          onClick={() => fetchAccountBalance(acc._id)}
                          title="Refresh balance"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="tab-panel">
            <div className="panel" style={{ minHeight: '400px' }}>
              <div className="panel-title" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={20} className="brand-icon" />
                  <span>My Active Accounts</span>
                </div>
                <button className="btn-primary" onClick={handleCreateAccount} disabled={loading}>
                  <Plus size={16} /> Open New Account
                </button>
              </div>

              {accounts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                  <Building2 size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p>You haven't opened any accounts yet. Create one to begin transferring funds.</p>
                </div>
              ) : (
                <div className="card-grid">
                  {accounts.map(acc => (
                    <div className="bank-card" key={acc._id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="card-chip"></div>
                        <span className="card-status">{acc.status}</span>
                      </div>
                      
                      <div className="card-number">
                        {acc._id}
                        <button 
                          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                          onClick={() => copyToClipboard(acc._id, 'Account ID')}
                        >
                          {copiedId === acc._id ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div className="card-footer">
                        <div className="card-holder">
                          <span className="card-balance-lbl">Ledger Balance</span>
                          <span className="card-balance-val">₹ {(balances[acc._id] !== undefined ? balances[acc._id] : 0).toLocaleString('en-IN')}</span>
                        </div>
                        <button 
                          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}
                          onClick={() => fetchAccountBalance(acc._id)}
                          title="Refresh balance"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className="tab-panel">
            <div className="panel">
              <div className="panel-title">
                <ArrowRightLeft size={20} className="brand-icon" />
                <span>Secure Money Transfer</span>
              </div>

              <form onSubmit={handleTransfer} className="bank-form">
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Source Account</label>
                  <select 
                    className="auth-input" 
                    style={{ paddingLeft: '14px', background: '#0f172a' }}
                    value={transferForm.fromAccount}
                    onChange={(e) => setTransferForm({ ...transferForm, fromAccount: e.target.value })}
                    required
                  >
                    <option value="">Select source account</option>
                    {accounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc._id} (₹{(balances[acc._id] || 0).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Destination Account ID</label>
                  <input 
                    type="text" 
                    placeholder="Enter recipient account ID" 
                    className="auth-input"
                    style={{ paddingLeft: '14px' }}
                    value={transferForm.toAccount}
                    onChange={(e) => setTransferForm({ ...transferForm, toAccount: e.target.value.trim() })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Amount (INR)</label>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="Enter transfer amount" 
                    className="auth-input"
                    style={{ paddingLeft: '14px' }}
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Idempotency Protection Key</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="auth-input"
                      style={{ paddingLeft: '14px', flex: 1, background: 'rgba(255,255,255,0.01)', color: 'var(--text-secondary)' }}
                      value={transferForm.idempotencyKey}
                      readOnly
                    />
                    <button 
                      type="button" 
                      className="btn-outline" 
                      style={{ padding: '0 16px' }}
                      onClick={() => setTransferForm(prev => ({ ...prev, idempotencyKey: generateUUID() }))}
                    >
                      Regen
                    </button>
                  </div>
                  <div className="idempotency-badge">
                    <Lock size={12} />
                    <span>Ensures transaction is atomic and safe from duplicate submissions.</span>
                  </div>
                </div>

                {loading && (
                  <div style={{ margin: '24px 0' }}>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${transferProgress}%` }}></div>
                    </div>
                    <div className="progress-bar-lbl">
                      <span>Executing double-entry ledger settlement...</span>
                      <span>{transferProgress}%</span>
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      <span>Processing Atomic Swap...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft size={16} />
                      <span>Confirm & Transfer</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="tab-panel">
            <div className="panel">
              <div className="panel-title" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={20} className="brand-icon" />
                  <span>Statement History Ledger</span>
                </div>
                <button className="btn-outline" onClick={fetchTransactions} style={{ padding: '8px 16px' }}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                  <History size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p>No transaction history recorded yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Type</th>
                        <th>From Account</th>
                        <th>To Account</th>
                        <th>Amount</th>
                        <th>Idempotency Key</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(txn => {
                        const isDebit = accounts.some(acc => acc._id === txn.fromAccount?._id);
                        return (
                          <tr key={txn._id}>
                            <td>{new Date(txn.createdAt).toLocaleString()}</td>
                            <td>
                              {isDebit ? (
                                <span className="type-badge debit">
                                  <TrendingDown size={14} /> DEBIT
                                </span>
                              ) : (
                                <span className="type-badge credit">
                                  <TrendingUp size={14} /> CREDIT
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>
                                {txn.fromAccount?._id || 'SYSTEM'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>
                                {txn.toAccount?._id || 'SYSTEM'}
                              </span>
                            </td>
                            <td style={{ fontWeight: '600' }}>
                              ₹ {txn.amount?.toLocaleString('en-IN')}
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                              {txn.idempotencyKey.substring(0, 16)}...
                            </td>
                            <td>
                              <span className={`status-badge ${txn.status?.toLowerCase()}`}>
                                {txn.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="tab-panel">
            <div className="panel">
              <div className="panel-title">
                <Coins size={20} className="brand-icon" />
                <span>Simulation Initial Deposit</span>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px', maxWidth: '600px' }}>
                <AlertTriangle style={{ color: 'var(--yellow)', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#fcd34d' }}>
                  This simulation tab triggers backend initial funds injections. Standard accounts can run deposit operations to seed accounts for testing.
                </p>
              </div>

              <form onSubmit={handleDeposit} className="bank-form">
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Destination Bank Account</label>
                  <select 
                    className="auth-input" 
                    style={{ paddingLeft: '14px', background: '#0f172a' }}
                    value={depositForm.toAccount}
                    onChange={(e) => setDepositForm({ ...depositForm, toAccount: e.target.value })}
                    required
                  >
                    <option value="">Select target account</option>
                    {accounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc._id} (₹{(balances[acc._id] || 0).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Deposit Amount (INR)</label>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="Enter deposit amount" 
                    className="auth-input"
                    style={{ paddingLeft: '14px' }}
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Idempotency Key</label>
                  <input 
                    type="text" 
                    className="auth-input"
                    style={{ paddingLeft: '14px', background: 'rgba(255,255,255,0.01)', color: 'var(--text-secondary)' }}
                    value={depositForm.idempotencyKey}
                    readOnly
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <>
                      <Coins size={16} />
                      <span>Deposit Simulation Funds</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notice */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <Info size={18} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
