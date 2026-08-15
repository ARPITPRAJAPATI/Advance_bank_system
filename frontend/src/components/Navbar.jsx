import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Navbar({ isAuthenticated = false, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0A0C10]/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold text-sm group-hover:border-white/20 transition-all">
            ✦
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            kube<span className="text-slate-400 font-light">Pay</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            About
          </Link>
          <a href="#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Features
          </a>
          
          {isAuthenticated ? (
            <>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Dashboard
              </button>
              <button 
                onClick={onLogout}
                className="px-5 py-2.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium text-sm hover:bg-red-500/20 transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="px-6 py-2.5 rounded-full bg-white text-slate-950 font-semibold text-sm hover:bg-slate-200 transition-all transform active:scale-95 shadow-lg shadow-white/5 cursor-pointer"
              >
                Open Account
              </button>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-300 hover:text-white cursor-pointer"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0A0C10] border-b border-white/10 px-6 py-6 space-y-4">
          <Link 
            to="/" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-300"
          >
            About
          </Link>
          <a 
            href="#features" 
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-300"
          >
            Features
          </a>
          <div className="pt-2 flex flex-col gap-3">
            {isAuthenticated ? (
              <button 
                onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                className="w-full py-3 rounded-full bg-white text-slate-950 font-semibold text-sm cursor-pointer"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button 
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                  className="w-full py-2.5 rounded-full border border-white/20 text-white font-medium text-sm cursor-pointer"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                  className="w-full py-3 rounded-full bg-white text-slate-950 font-semibold text-sm cursor-pointer"
                >
                  Open Account
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
