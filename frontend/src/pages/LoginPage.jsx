import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#12161F] border border-white/10 rounded-2xl p-8 shadow-2xl">
        
        {/* Header / Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
            ✦
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign In to novaPay</h1>
          <p className="text-sm text-slate-400 mt-1">Enter your credentials to access your banking account</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-3 text-slate-500 pointer-events-none" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                className="w-full bg-slate-950/60 text-white placeholder-slate-500 text-sm rounded-xl py-3 pl-10 pr-4 border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-3 text-slate-500 pointer-events-none" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 text-white placeholder-slate-500 text-sm rounded-xl py-3 pl-10 pr-4 border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 rounded-full bg-white text-slate-950 font-semibold text-sm hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-white/5"
          >
            {isLoading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-slate-400">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-white font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
