import React, { useState } from 'react';
import { Bus, Lock, Mail, Phone, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types/cibus';

interface AuthPageProps {
  onSuccessNavigate: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccessNavigate }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+63917');
  const [discountType, setDiscountType] = useState<'REGULAR' | 'STUDENT' | 'SENIOR' | 'PWD'>('REGULAR');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === 'LOGIN' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'LOGIN'
          ? { email, password }
          : { email, password, fullName, phone, discountType };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
      } else {
        login(data.token, data.user);
        onSuccessNavigate(data.user);
      }
    } catch {
      setError('Unable to reach CIBUS authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('cibus123');
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: presetEmail, password: 'cibus123' }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        onSuccessNavigate(data.user);
      } else {
        setError(data.error || 'Quick login failed.');
      }
    } catch {
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#F4F7FB] flex items-center justify-center p-3 sm:p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-elevated">
        {/* Left Form Column */}
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-[#102542]">
              {mode === 'LOGIN' ? 'Sign In to CIBUS Cebu' : 'Create Commuter Account'}
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              {mode === 'LOGIN'
                ? 'Access real-time bus tracking, waiting requests, driver tools, or dispatch controls.'
                : 'Register as a Cebu commuter to report waiting groups and purchase QR digital tickets.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#F4F7FB] rounded-xl border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                mode === 'LOGIN' ? 'bg-[#0B2545] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#102542]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                mode === 'REGISTER' ? 'bg-[#0B2545] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#102542]'
              }`}
            >
              Passenger Sign Up
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E5484D] text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'REGISTER' && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542] focus:border-[#268DE0] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Mobile Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+639171234567"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542] focus:border-[#268DE0] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Fare Category</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542] focus:border-[#268DE0] focus:bg-white focus:outline-none"
                    >
                      <option value="REGULAR">Regular Commuter</option>
                      <option value="STUDENT">Student (20% Discount)</option>
                      <option value="SENIOR">Senior Citizen (20% Discount)</option>
                      <option value="PWD">PWD (20% Discount)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@cibuscebu.ph"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542] focus:border-[#268DE0] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542] focus:border-[#268DE0] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-extrabold text-sm shadow-sm disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : mode === 'LOGIN' ? 'Sign In to CIBUS Platform' : 'Create Passenger Account'}
            </button>
          </form>
        </div>

        {/* Right Quick Role Testing Panel */}
        <div className="lg:col-span-5 bg-[#0B2545] text-white p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-bold">
              <Bus className="w-3.5 h-3.5" />
              <span>Role-Based Verification Accounts</span>
            </div>
            <h3 className="text-lg font-extrabold text-white">One-Click Role Switcher</h3>
            <p className="text-xs text-sky-100/80 leading-relaxed">
              Test real-time synchronization across Passenger, Driver, Conductor, and Administrator accounts
              (Password for all pre-seeded accounts: <code className="text-sky-300 font-mono font-bold">cibus123</code>).
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => quickLogin('commuter@cebu.ph')}
                className="w-full text-left p-3 rounded-xl bg-[#153E70]/80 hover:bg-[#153E70] border border-white/10 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-sky-300 uppercase">Passenger Account</div>
                  <div className="text-sm font-bold text-white">Bea Alcantara</div>
                  <div className="text-[11px] text-sky-200/70">commuter@cebu.ph</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#268DE0] text-white text-xs font-bold">Sign In →</span>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('driver1@cibuscebu.ph')}
                className="w-full text-left p-3 rounded-xl bg-[#153E70]/80 hover:bg-[#153E70] border border-white/10 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-emerald-300 uppercase">Driver (CIBUS-001)</div>
                  <div className="text-sm font-bold text-white">Ramonjek Abellana</div>
                  <div className="text-[11px] text-sky-200/70">driver1@cibuscebu.ph</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#159B62] text-white text-xs font-bold">Sign In →</span>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('conductor1@cibuscebu.ph')}
                className="w-full text-left p-3 rounded-xl bg-[#153E70]/80 hover:bg-[#153E70] border border-white/10 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-amber-300 uppercase">Conductor (CIBUS-001)</div>
                  <div className="text-sm font-bold text-white">Marites Villamor</div>
                  <div className="text-[11px] text-sky-200/70">conductor1@cibuscebu.ph</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#F59E0B] text-[#0B2545] text-xs font-bold">Sign In →</span>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('admin@cibuscebu.ph')}
                className="w-full text-left p-3 rounded-xl bg-[#153E70]/80 hover:bg-[#153E70] border border-white/10 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-sky-200 uppercase">Dispatcher / Admin</div>
                  <div className="text-sm font-bold text-white">Engr. Carlos Mendoza</div>
                  <div className="text-[11px] text-sky-200/70">admin@cibuscebu.ph</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white text-[#0B2545] text-xs font-bold">Sign In →</span>
              </button>
            </div>
          </div>

          <div className="pt-6 text-[11px] text-sky-200/80 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#159B62] shrink-0" />
            <span>Role-based JWT authorization & Dry-Run instant testing enabled.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
