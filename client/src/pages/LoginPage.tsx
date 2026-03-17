import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { resolveBrandingForDomain, useBranding, type ResolvedBrandingSettings } from '../hooks/useBranding';

import { API_BASE_URL } from '../config';

const genericBranding = {
  organizationName: '',
  shortName: '',
  tagline: '',
  supportEmail: '',
  logoDataUrl: null as string | null,
};

const LoginPage = () => {
  const { login } = useAuth();
  const { branding } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [resolvedBranding, setResolvedBranding] = useState<ResolvedBrandingSettings | null>(null);

  const emailDomain = useMemo(() => {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].trim().toLowerCase() : '';
  }, [email]);

  const activeBranding = step === 'email' ? genericBranding : resolvedBranding || branding;

  useEffect(() => {
    document.title = step === 'email' ? 'Login' : activeBranding.shortName || activeBranding.organizationName || 'Login';
  }, [activeBranding.organizationName, activeBranding.shortName, step]);

  const handleContinue = async () => {
    if (!email || !email.includes('@')) {
      setError('Inserisci un indirizzo email valido.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextBranding = await resolveBrandingForDomain(emailDomain);
      setResolvedBranding(nextBranding);

      if (nextBranding.authDomain && !nextBranding.matchedDomain) {
        setError('Email non valida.');
        return;
      }

      setStep('password');
    } catch {
      setResolvedBranding(null);
      setError('Email non valida.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      login(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || "Errore durante l'autenticazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            {step === 'password' && activeBranding.logoDataUrl ? (
              <img
                src={activeBranding.logoDataUrl}
                alt={`Logo ${activeBranding.organizationName}`}
                className="w-16 h-16 rounded-2xl object-cover mb-4 border border-blue-500/30 bg-slate-950 p-1"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
                <LogIn className="text-blue-500" size={32} />
              </div>
            )}
            <h1 className="text-3xl font-bold text-white tracking-tight">{step === 'email' ? 'Login' : activeBranding.shortName || activeBranding.organizationName}</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || step === 'password'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all disabled:opacity-80"
                  placeholder="email@domain"
                />
              </div>
            </div>

            {step === 'password' && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all"
                    placeholder="password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl flex items-center space-x-3 text-sm animate-in slide-in-from-top-2 duration-300 bg-red-600/20 text-red-300 border border-red-500/30">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 'email' ? (
              <button
                type="button"
                onClick={handleContinue}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                <span>Continua</span>
              </button>
            ) : (
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setPassword('');
                    setShowPassword(false);
                    setError(null);
                  }}
                  className="w-14 shrink-0 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                  <span>Accedi</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
