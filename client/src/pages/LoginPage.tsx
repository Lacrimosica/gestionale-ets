import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LogIn,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  UsersRound,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/auth-context';
import { useSetupStatus } from '../hooks/useSetupStatus';
import { useBranding } from '../hooks/branding-context';
import { API_BASE_URL } from '../config';
import { TwoStepSignIn } from '../components/auth/TwoStepSignIn';
import { isPendingStep, type LoginResponse, type PendingStep } from '../lib/two-step';

const genericBranding = {
  name: '',
  shortName: '',
  tagline: '',
  supportEmail: '',
  logoDataUrl: null as string | null,
};

const driftingFlowers = [
  { left: '6%', delay: '-14s', duration: '25s', size: 'w-5', drift: ['-35px', '20px', '-15px', '-55px'] },
  { left: '15%', delay: '-5s', duration: '20s', size: 'w-4', drift: ['35px', '10px', '45px', '65px'] },
  { left: '25%', delay: '-19s', duration: '28s', size: 'w-6', drift: ['-15px', '-45px', '-20px', '-35px'] },
  { left: '34%', delay: '-9s', duration: '23s', size: 'w-4', drift: ['45px', '20px', '60px', '80px'] },
  { left: '43%', delay: '-22s', duration: '27s', size: 'w-5', drift: ['-40px', '-15px', '-50px', '-70px'] },
  { left: '52%', delay: '-3s', duration: '19s', size: 'w-4', drift: ['20px', '35px', '10px', '45px'] },
  { left: '61%', delay: '-16s', duration: '26s', size: 'w-5', drift: ['-25px', '-50px', '-35px', '-60px'] },
  { left: '72%', delay: '-11s', duration: '22s', size: 'w-4', drift: ['35px', '15px', '45px', '55px'] },
  { left: '83%', delay: '-24s', duration: '29s', size: 'w-6', drift: ['-20px', '-35px', '-10px', '-40px'] },
  { left: '94%', delay: '-7s', duration: '21s', size: 'w-4', drift: ['40px', '20px', '55px', '70px'] },
];

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
  // Set when the password was right but the server wants another step first.
  const [pendingStep, setPendingStep] = useState<PendingStep | null>(null);

  const activeBranding = branding || genericBranding;

  useEffect(() => {
    const title = step === 'email'
      ? t('auth.login')
      : activeBranding.shortName || activeBranding.name || t('auth.login');
    document.title = `${title} | Niki`;
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
      const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      if (isPendingStep(response.data)) {
        setPassword('');
        setPendingStep(response.data);
      } else {
        login(response.data.token, response.data.user);
      }
    } catch (err: unknown) {
      const message = axios.isAxiosError(err) ? err.response?.data?.error : undefined;
      setError(message || t('auth.loginPage.authError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-900 text-neutral-100">
      <div aria-hidden="true" className="login-orbit pointer-events-none absolute -left-48 -top-48 h-[34rem] w-[34rem] rounded-full border border-accent-500/10" />
      <div aria-hidden="true" className="login-orbit-reverse pointer-events-none absolute -left-28 -top-28 h-[25rem] w-[25rem] rounded-full border border-accent-500/10" />
      <div aria-hidden="true" className="login-glow pointer-events-none absolute left-[32%] top-[24%] h-64 w-64 rounded-full bg-accent-500/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {driftingFlowers.map((flower, index) => (
          <img
            key={flower.left}
            src="/brand/niki-mark.svg"
            alt=""
            className={`login-petal login-petal-${index % 2 === 0 ? 'right' : 'left'} absolute top-[-8%] ${flower.size}`}
            style={{
              left: flower.left,
              animationDelay: flower.delay,
              animationDuration: flower.duration,
              '--petal-drift-1': flower.drift[0],
              '--petal-drift-2': flower.drift[1],
              '--petal-drift-3': flower.drift[2],
              '--petal-drift-4': flower.drift[3],
            } as CSSProperties}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => i18n.changeLanguage(i18n.language === 'it' ? 'en' : 'it')}
        aria-label={i18n.language === 'it' ? 'Switch language to English' : 'Cambia lingua in italiano'}
        className="absolute right-5 top-5 z-10 rounded-full border border-neutral-700 bg-neutral-950/80 px-4 py-2 text-xs font-semibold text-neutral-400 shadow-sm transition-colors hover:border-accent-500/50 hover:text-accent-500 sm:right-8 sm:top-7"
      >
        {i18n.language === 'it' ? 'EN' : 'IT'}
      </button>

      <main className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex items-center px-6 pb-10 pt-20 sm:px-10 lg:px-14 lg:py-16 xl:px-24">
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-10 flex items-center gap-4 sm:mb-14">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F8F5F0] p-2.5 shadow-sm">
                <img src="/brand/niki-mark.svg" alt="" className="h-full w-full object-contain" />
              </span>
              <div>
                <div className="text-2xl font-bold tracking-tight text-neutral-100">Niki</div>
                <p className="mt-0.5 text-xs font-medium tracking-wide text-neutral-400 sm:text-sm">
                  {t('auth.loginPage.brandTagline')}
                </p>
              </div>
            </div>

            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-500">
              {t('auth.loginPage.welcomeEyebrow')}
            </p>
            <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-neutral-100 sm:text-5xl">
              {t('auth.loginPage.brandHeadline')}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-neutral-300 sm:text-lg">
              {t('auth.loginPage.brandDescription')}
            </p>

            <div className="mt-9 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: UsersRound, label: t('auth.loginPage.featurePeople') },
                { icon: Landmark, label: t('auth.loginPage.featureGovernance') },
                { icon: ShieldCheck, label: t('auth.loginPage.featureCompliance') },
              ].map(({ icon: Icon, label }, index) => (
                <div
                  key={label}
                  className="login-feature flex items-center gap-3 rounded-2xl border border-neutral-700/70 bg-neutral-950/40 px-4 py-3"
                  style={{ animationDelay: `${index * 0.8}s` }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-600/10 text-accent-600">
                    <Icon size={18} />
                  </span>
                  <span className="text-sm font-medium text-neutral-200">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-neutral-950/70 px-5 py-10 sm:px-8 lg:px-12 lg:py-20">
          <div className="login-enter w-full max-w-md">
            <div className="rounded-3xl border border-neutral-700/70 bg-neutral-900 p-6 shadow-xl shadow-neutral-950/10 sm:p-9">
              <div className="mb-8">
                <div className="mb-6 flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-accent-500/20 bg-accent-600/10">
                  {step === 'password' && activeBranding.logoDataUrl ? (
                    <img
                      src={activeBranding.logoDataUrl}
                      alt={`Logo ${activeBranding.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <LogIn className="text-accent-600" size={22} />
                  )}
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-600">
                  {t('auth.loginPage.welcomeEyebrow')}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">
                  {step === 'email'
                    ? t('auth.loginPage.welcomeTitle')
                    : activeBranding.shortName || activeBranding.name || t('auth.loginPage.welcomeTitle')}
                </h1>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  {t('auth.loginPage.welcomeDescription')}
                </p>
              </div>

              {sessionExpired && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-warning-500/30 bg-warning-600/20 p-4 text-sm text-warning-300 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{t('auth.loginPage.sessionExpired')}</span>
                </div>
              )}

              {pendingStep ? (
                <TwoStepSignIn
                  initial={pendingStep}
                  email={email}
                  onSignedIn={(session) => login(session.token, session.user)}
                  onCancel={() => {
                    setPendingStep(null);
                    setStep('email');
                    setError(null);
                  }}
                />
              ) : (
              <>
              <button
                type="button"
                onClick={() => { window.location.href = `${API_BASE_URL}/auth/google`; }}
                className="mb-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3 font-semibold text-[#1F1D24] shadow-sm transition-colors hover:bg-[#F1F3F4]"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                {t('auth.loginPage.signInWithGoogle')}
              </button>

              <div className="mb-2 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-700" />
                <span className="text-xs font-medium text-neutral-500">{t('auth.loginPage.or')}</span>
                <div className="h-px flex-1 bg-neutral-700" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="login-email" className="mb-2 ml-1 block text-sm font-medium text-neutral-300">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} aria-hidden="true" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading || step === 'password'}
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-950 py-3 pl-12 pr-4 text-fg outline-none transition-all placeholder:text-neutral-500 focus:border-accent-500 focus:ring-4 focus:ring-accent-600/10 disabled:opacity-80"
                      placeholder={t('auth.loginPage.emailPlaceholder')}
                    />
                  </div>
                </div>

                {step === 'password' && (
                  <div>
                    <label htmlFor="login-password" className="mb-2 ml-1 block text-sm font-medium text-neutral-300">{t('auth.password')}</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} aria-hidden="true" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 py-3 pl-12 pr-12 text-fg outline-none transition-all placeholder:text-neutral-500 focus:border-accent-500 focus:ring-4 focus:ring-accent-600/10"
                        placeholder={t('auth.loginPage.passwordPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-accent-600"
                        aria-label={showPassword
                          ? t('auth.loginPage.hidePassword')
                          : t('auth.loginPage.showPassword')}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-600/10 p-4 text-sm text-danger-400 animate-in slide-in-from-top-2 duration-300">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {step === 'email' ? (
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={loading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-600 py-4 font-bold text-white shadow-lg shadow-accent-900/15 transition-all hover:bg-accent-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                    <span>{t('auth.loginPage.continue')}</span>
                  </button>
                ) : (
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setPassword('');
                        setShowPassword(false);
                        setError(null);
                      }}
                      className="flex w-14 shrink-0 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800 font-bold text-neutral-300 transition-colors hover:bg-neutral-700"
                      aria-label={t('auth.loginPage.backToEmail')}
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-600 py-4 font-bold text-white shadow-lg shadow-accent-900/15 transition-all hover:bg-accent-700 active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                      <span>{t('auth.loginPage.signIn')}</span>
                    </button>
                  </div>
                )}
              </form>

              </>
              )}

              {deploymentMode !== 'single_org' && deploymentMode !== 'closed' && (
                <div className="mt-7 border-t border-neutral-700 pt-6">
                  <p className="mb-3 text-center text-sm text-neutral-400">{t('auth.loginPage.noAccount')}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/signup')}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-800 py-3 font-semibold text-neutral-200 transition-colors hover:border-accent-500/50 hover:bg-neutral-700"
                  >
                    {t('auth.loginPage.createOrganization')}
                  </button>
                </div>
              )}
            </div>
            <p className="mt-5 text-center text-xs text-neutral-500">{t('auth.loginPage.brandTagline')}</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
