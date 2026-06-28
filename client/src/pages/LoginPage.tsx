import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSetupStatus } from '../hooks/useSetupStatus';
import { useBranding } from '../hooks/useBranding';
import { API_BASE_URL } from '../config';

const genericBranding = {
  name: '',
  shortName: '',
  tagline: '',
  supportEmail: '',
  logoDataUrl: null as string | null,
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { branding } = useBranding();
  const { deploymentMode } = useSetupStatus();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');

  const activeBranding = branding || genericBranding;

  useEffect(() => {
    document.title = step === 'email'
      ? t('auth.login')
      : activeBranding.shortName || activeBranding.name || t('auth.login');
  }, [activeBranding.name, activeBranding.shortName, step, t]);

  useEffect(() => {
    if (sessionStorage.getItem('session_expired')) {
      setSessionExpired(true);
      sessionStorage.removeItem('session_expired');
    }
  }, []);

  const handleContinue = async () => {
    if (!email || !email.includes('@')) {
      setError(t('auth.loginPage.emailInvalid'));
      return;
    }
    setStep('password');
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
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
      setError(message || t('auth.loginPage.authError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
      <button
        type="button"
        onClick={() => i18n.changeLanguage(i18n.language === 'it' ? 'en' : 'it')}
        className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white text-xs font-medium transition-all"
      >
        {i18n.language === 'it' ? 'EN' : 'IT'}
      </button>

      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            {step === 'password' && activeBranding.logoDataUrl ? (
              <img
                src={activeBranding.logoDataUrl}
                alt={`Logo ${activeBranding.name}`}
                className="w-16 h-16 rounded-2xl object-cover mb-4 border border-blue-500/30 bg-slate-950 p-1"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
                <LogIn className="text-blue-500" size={32} />
              </div>
            )}
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {step === 'email' ? t('auth.login') : activeBranding.shortName || activeBranding.name}
            </h1>
          </div>

          {sessionExpired && (
            <div className="mb-6 p-4 rounded-xl flex items-center space-x-3 text-sm animate-in slide-in-from-top-2 duration-300 bg-amber-600/20 text-amber-300 border border-amber-500/30">
              <AlertCircle size={18} className="shrink-0" />
              <span>{t('auth.loginPage.sessionExpired')}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => { window.location.href = `${API_BASE_URL}/auth/google`; }}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-800 font-semibold py-3 rounded-xl transition-all shadow mb-6"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            {t('auth.loginPage.signInWithGoogle')}
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600 font-medium">{t('auth.loginPage.or')}</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || step === 'password'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all disabled:opacity-80"
                  placeholder={t('auth.loginPage.emailPlaceholder')}
                />
              </div>
            </div>

            {step === 'password' && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">{t('auth.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all"
                    placeholder={t('auth.loginPage.passwordPlaceholder')}
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
                <span>{t('auth.loginPage.continue')}</span>
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
                  <span>{t('auth.loginPage.signIn')}</span>
                </button>
              </div>
            )}
          </form>

          {deploymentMode !== 'single_org' && deploymentMode !== 'closed' && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <p className="text-sm text-slate-400 text-center mb-3">{t('auth.loginPage.noAccount')}</p>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all"
              >
                {t('auth.loginPage.createOrganization')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
