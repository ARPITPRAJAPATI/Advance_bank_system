import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TiltCard from '../components/TiltCard';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { Wifi, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  
  const words = ['teens', 'adults', 'everyone'];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-100 flex flex-col font-sans selection:bg-white/20 overflow-x-hidden relative">
      <Navbar isAuthenticated={isAuthenticated} onLogout={logout} />

      <main className="flex-1 relative z-10">
        
        {/* Hero Section */}
        <section className="pt-12 pb-20 lg:pt-20 lg:pb-32 px-6 sm:px-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-8 text-left">
              <div className="space-y-1">
                <div className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>navya</span>
                  <span className="text-slate-400 font-light">Pay</span>
                  <span className="inline-block text-2xl text-slate-400 animate-spin [animation-duration:10s]">
                    ✦
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-500 tracking-widest uppercase pl-1">
                  Private Wealth Banking
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-white">
                spending account<br />
                for <span className="text-slate-400 font-light transition-all duration-500">{words[wordIndex]}</span>
              </h1>

              <div className="pt-2">
                <Button
                  size="lg"
                  variant="primary"
                  onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Open Account'} <ArrowRight size={18} />
                </Button>
              </div>
            </div>

            {/* Right Card Mockup */}
            <div className="lg:col-span-6 relative flex justify-center items-center py-6 [perspective:1200px]">
              <div className="animate-float-3d relative flex justify-center items-center">

                <TiltCard 
                  maxTilt={10}
                  className="w-[290px] sm:w-[310px] h-[540px] rounded-[40px] bg-[#12161F] border-[6px] border-white/15 p-5 shadow-2xl flex flex-col justify-between text-left backdrop-blur-xl"
                >
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                          ✦
                        </div>
                        <span className="text-xs font-bold text-white">navyaPay</span>
                      </div>
                      <span className="text-xs text-slate-400">🔔</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-1">
                      <span className="text-[11px] text-slate-400 font-medium">Account balance</span>
                      <div className="text-2xl font-extrabold text-white flex items-center gap-2">
                        ₹ 2,450 <span className="text-xs text-emerald-400 font-bold">+</span>
                      </div>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono text-slate-300">
                      <span>64927845@navya</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Copy</span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block px-1">
                        Recent transactions
                      </span>
                      
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Zomato Food</span>
                        <span className="font-bold text-emerald-400">+ ₹5,435</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Chai Point</span>
                        <span className="font-bold text-slate-400">₹ 145</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Friend Transfer</span>
                        <span className="font-bold text-slate-400">₹ 500</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex justify-around text-slate-500 text-xs">
                    <span className="text-white font-bold">✦</span>
                    <span>⚙</span>
                    <span>🏠</span>
                    <span>💳</span>
                  </div>
                </TiltCard>

                <div className="animate-float-card absolute -left-4 sm:left-2 bottom-8 z-30">
                  <TiltCard 
                    maxTilt={16}
                    className="w-[240px] sm:w-[260px] h-[155px] rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black p-4 text-left shadow-2xl border border-white/25 flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start relative z-10">
                      <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">PLATINUM</span>
                      <Wifi size={18} className="text-slate-300 rotate-90" />
                    </div>

                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-8 h-6 rounded bg-amber-400/20 border border-amber-300/40" />
                      <span className="text-lg font-bold text-white tracking-tight">navyaPay</span>
                    </div>

                    <div className="flex justify-between items-end relative z-10">
                      <div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">ARPIT PRAJAPATI</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-white italic">RuPay</span>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">PREPAID</div>
                      </div>
                    </div>
                  </TiltCard>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* Trust Section */}
        <section className="bg-[#12161F] border-y border-white/[0.08] py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-8 text-center sm:text-left">
            <div className="flex items-center gap-4 border-r-0 sm:border-r border-white/10 pr-0 sm:pr-8">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl text-white">
                🛡️
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-white">10 million+</div>
                <div className="text-xs text-slate-400 font-medium">users love Navya Pay</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-8 sm:gap-12 text-slate-400 font-semibold text-sm">
              <span className="text-xs text-slate-500 font-normal">Powered by</span>
              <span className="text-white text-base font-bold">Encrypted Ledger</span>
              <span className="text-white text-xl font-bold italic">VISA</span>
              <span className="text-white text-xl font-bold italic">RuPay</span>
              <span className="text-white text-base font-bold">UPI</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto w-full space-y-16">
          <div className="text-left space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Built for <span className="text-slate-400 font-light">quiet luxury &amp; precision.</span>
            </h2>
            <p className="text-slate-400 text-base">
              No hidden fees, no branch visits, zero friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TiltCard maxTilt={12} className="p-8 rounded-2xl bg-[#12161F]/80 border border-white/[0.08] text-left space-y-5 hover:border-white/25 backdrop-blur-xl shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl text-white">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-white">Instant UPI Ledgers</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Scan any QR code and transfer money directly from your <span className="text-white font-medium">@navya</span> handle with zero latency.
              </p>
            </TiltCard>

            <TiltCard maxTilt={12} className="p-8 rounded-2xl bg-[#12161F]/80 border border-white/[0.08] text-left space-y-5 hover:border-white/25 backdrop-blur-xl shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl text-white">
                💳
              </div>
              <h3 className="text-xl font-bold text-white">Numberless Platinum Card</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                A physical card with no numbers printed on it for ultimate safety. Tap &amp; pay securely anywhere.
              </p>
            </TiltCard>

            <TiltCard maxTilt={12} className="p-8 rounded-2xl bg-[#12161F]/80 border border-white/[0.08] text-left space-y-5 hover:border-white/25 backdrop-blur-xl shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl text-white">
                🔒
              </div>
              <h3 className="text-xl font-bold text-white">Secure Cookie Shield</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Protected by HTTP-Only cookies, bcrypt password hashing, and instant token revocation on sign out.
              </p>
            </TiltCard>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6 max-w-4xl mx-auto text-center">
          <TiltCard maxTilt={8} className="p-12 rounded-3xl bg-[#12161F]/90 border border-white/10 space-y-6 backdrop-blur-xl shadow-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Ready to get your <span className="text-slate-400 font-light">Navya Pay card?</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Join 10 million+ users. Setup takes less than 60 seconds.
            </p>
            <div className="flex justify-center pt-2">
              <Button
                size="lg"
                variant="primary"
                onClick={() => navigate('/register')}
              >
                Open Account Now <ArrowRight size={18} />
              </Button>
            </div>
          </TiltCard>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 bg-[#0A0C10] text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <span>✦ navya<span className="text-slate-400 font-light">Pay</span></span>
            <span className="text-xs text-slate-500 font-normal">• Private Wealth Banking</span>
          </div>
          <p>© 2026 Navya Pay Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
