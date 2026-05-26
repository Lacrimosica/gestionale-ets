import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../hooks/useAuth';
import { useSetupStatus } from '../hooks/useSetupStatus';

const STEPS = [
  { number: 1, title: 'Informazioni Organizzazione' },
  { number: 2, title: 'Impostazioni Autenticazione' },
  { number: 3, title: 'Account Amministratore' },
  { number: 4, title: 'Riepilogo e Conferma' }
];

// localStorage state schema
interface WizardState {
  version: 2;
  currentStep: number;
  completedSteps: number[];
  formData: {
    orgName: string;
    shortName: string;
    slug: string;
    authDomain: string;
    domainSignupMode: 'invite_only' | 'open' | 'disabled';
    adminEmail: string;
  };
  googlePreFill: {
    email: string;
    googleToken: string;
  } | null;
  setupToken: string | null;
  setupTokenExp: number | null;
}

interface SetupPayload {
  orgName: string;
  shortName: string;
  slug: string;
  authDomain?: string;
  domainSignupMode: 'invite_only' | 'open' | 'disabled';
  adminEmail: string;
  googleToken?: string;
  adminPassword?: string;
}

const STORAGE_KEY = 'setup_wizard_v2';

export default function SetupWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { deploymentMode, needsSetup, loading: statusLoading, error: statusError } = useSetupStatus();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    orgName: '',
    shortName: '',
    slug: '',
    authDomain: '',
    domainSignupMode: 'invite_only',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: ''
  });

  const [googlePreFill, setGooglePreFill] = useState<{ email: string; googleToken: string } | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [setupTokenExp, setSetupTokenExp] = useState<number | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const { isAuthenticated } = useAuth();
  const hasInitialized = useRef(false);

  // ─ Navigate to dashboard once setup is complete and auth state is ready ─
  useEffect(() => {
    if (setupComplete && isAuthenticated) {
      navigate('/');
    }
  }, [setupComplete, isAuthenticated, navigate]);

  // ─ Handle closed mode redirect ─
  useEffect(() => {
    if (!statusLoading) {
      if (deploymentMode === 'closed') {
        if (!needsSetup) {
          // System is in closed mode and already set up, redirect to login
          navigate('/login');
        } else {
          // System is in closed mode but not set up — show blocked UI
          setError('Organization creation is disabled in this system.');
        }
      }
    }
  }, [deploymentMode, needsSetup, statusLoading, navigate]);

  // ─ Load state from localStorage on mount ─
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    // Check for Google pre-fill from URL param
    const googleToken = searchParams.get('googleToken');
    if (googleToken) {
      try {
        // Decode JWT payload (no sig verification — server will verify on submit)
        const parts = googleToken.split('.');
        if (parts.length === 3) {
          const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
          const payload = JSON.parse(atob(padded));
          if (payload.email) {
            setGooglePreFill({ email: payload.email, googleToken });
            setFormData(prev => ({ ...prev, adminEmail: payload.email }));
          }
        }
      } catch (err) {
        console.error('Failed to decode googleToken:', err);
      }
    }

    // Restore form state from localStorage if it exists
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: WizardState = JSON.parse(saved);
        if (parsed.version === 2) {
          setFormData(prev => ({
            ...prev,
            ...parsed.formData,
            // Never restore passwords from localStorage
            adminPassword: '',
            confirmPassword: ''
          }));
          setCurrentStep(parsed.currentStep);
          setCompletedSteps(parsed.completedSteps);
          setGooglePreFill(parsed.googlePreFill);
          setSetupToken(parsed.setupToken);
          setSetupTokenExp(parsed.setupTokenExp);
        }
      } catch (err) {
        console.error('Failed to restore wizard state:', err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Fetch a fresh setup token (skip if in closed mode)
    if (deploymentMode !== 'closed') {
      fetchSetupToken();
    }
  }, [deploymentMode, searchParams]);

  // ─ Save state to localStorage whenever it changes ─
  useEffect(() => {
    const state: WizardState = {
      version: 2,
      currentStep,
      completedSteps,
      formData: {
        orgName: formData.orgName,
        shortName: formData.shortName,
        slug: formData.slug,
        authDomain: formData.authDomain,
        domainSignupMode: formData.domainSignupMode as 'invite_only' | 'open' | 'disabled',
        adminEmail: formData.adminEmail
        // adminPassword and confirmPassword are never persisted
      },
      googlePreFill,
      setupToken,
      setupTokenExp
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [currentStep, completedSteps, formData.orgName, formData.shortName, formData.slug, formData.authDomain, formData.domainSignupMode, formData.adminEmail, googlePreFill, setupToken, setupTokenExp]);

  const fetchSetupToken = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/setup/token`);
      const token = response.data.setupToken;
      setSetupToken(token);
      // Setup token expires in 30 minutes, refresh 1 minute before expiry
      setSetupTokenExp(Math.floor(Date.now() / 1000) + 29 * 60);
    } catch (err) {
      console.error('Failed to fetch setup token:', err);
      setError('Impossibile ottenere il token di configurazione. Riprova.');
    }
  };

  const ensureSetupToken = async () => {
    const now = Math.floor(Date.now() / 1000);
    if (!setupToken || !setupTokenExp || setupTokenExp - now < 60) {
      // Token missing or expiring soon — refresh it
      await fetchSetupToken();
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  };

  const handleOrgNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      orgName: value,
      slug: generateSlug(value)
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    setError('');

    if (step === 1) {
      if (!formData.orgName.trim()) {
        setError('Il nome dell\'organizzazione è obbligatorio.');
        return false;
      }
      if (!formData.shortName.trim()) {
        setError('L\'acronimo è obbligatorio.');
        return false;
      }
      if (formData.shortName.length > 10) {
        setError('L\'acronimo deve essere al massimo 10 caratteri.');
        return false;
      }
      if (!formData.slug.trim()) {
        setError('Lo slug è obbligatorio.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.domainSignupMode) {
        setError('Seleziona una modalità di iscrizione.');
        return false;
      }
    }

    if (step === 3) {
      if (!formData.adminEmail.trim()) {
        setError('L\'email è obbligatoria.');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.adminEmail)) {
        setError('Inserisci un\'email valida.');
        return false;
      }

      // If not using Google pre-fill, password is required
      if (!googlePreFill) {
        if (!formData.adminPassword) {
          setError('La password è obbligatoria.');
          return false;
        }
        if (formData.adminPassword.length < 8) {
          setError('La password deve essere di almeno 8 caratteri.');
          return false;
        }
        if (formData.adminPassword !== formData.confirmPassword) {
          setError('Le password non corrispondono.');
          return false;
        }
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    await ensureSetupToken();
    if (!setupToken) {
      setError('Impossibile ottenere il token di configurazione. Riprova.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: SetupPayload = {
        orgName: formData.orgName,
        shortName: formData.shortName,
        slug: formData.slug,
        authDomain: formData.authDomain || undefined,
        domainSignupMode: formData.domainSignupMode as 'invite_only' | 'open' | 'disabled',
        adminEmail: formData.adminEmail
      };

      // Use googleToken if available (from Google pre-fill flow)
      if (googlePreFill?.googleToken) {
        payload.googleToken = googlePreFill.googleToken;
      } else {
        // Otherwise use password
        payload.adminPassword = formData.adminPassword;
      }

      const response = await axios.post(`${API_BASE_URL}/setup`, payload, {
        headers: {
          'Authorization': `Bearer ${setupToken}`
        }
      });

      const { token, user } = response.data;
      login(token, user);
      setSetupComplete(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Si è verificato un errore durante la configurazione. Riprova.');
      }
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      setLoading(false);
    }
  };

  const handleQuickSetup = async () => {
    await ensureSetupToken();
    if (!setupToken) {
      setError('Impossibile ottenere il token di configurazione. Riprova.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        orgName: 'Test Organization',
        shortName: 'TA',
        slug: 'test-organization',
        authDomain: 'test.test',
        domainSignupMode: 'invite_only',
        adminEmail: 'admin@test.test',
        adminPassword: 'Password123'
      };

      const response = await axios.post(`${API_BASE_URL}/setup`, payload, {
        headers: {
          'Authorization': `Bearer ${setupToken}`
        }
      });

      const { token, user } = response.data;
      login(token, user);
      setSetupComplete(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Si è verificato un errore durante la configurazione. Riprova.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking setup status
  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  // Show error if server is unreachable
  if (statusError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
          <div className="text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-2xl font-bold text-white">Server Unreachable</h1>
            <p className="text-slate-300">
              Unable to connect to the server. Please check your connection and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show blocked UI if in closed mode and setup is incomplete
  if (deploymentMode === 'closed' && needsSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
          <div className="text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <h1 className="text-2xl font-bold text-white">System Locked</h1>
            <p className="text-slate-300">
              Organization creation is disabled in this system.
            </p>
            <p className="text-sm text-slate-400">
              Please contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm transition-colors ${
                  step.number === currentStep
                    ? 'bg-blue-600 text-white'
                    : completedSteps.includes(step.number)
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                }`}
              >
                {completedSteps.includes(step.number) ? '✓' : step.number}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white">{STEPS[currentStep - 1].title}</h2>
            <p className="text-slate-400 text-sm mt-1">
              Passo {currentStep} di {STEPS.length}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Organization Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Nome Organizzazione *
              </label>
              <input
                type="text"
                value={formData.orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                placeholder="es. Volontari Solidali"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Acronimo *
              </label>
              <input
                type="text"
                maxLength={10}
                value={formData.shortName}
                onChange={(e) => handleInputChange('shortName', e.target.value)}
                placeholder="es. VS"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Max 10 caratteri</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Slug (URL-safe) *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="es. volontari-solidali"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Generato automaticamente dal nome, puoi modificarlo</p>
            </div>
          </div>
        )}

        {/* Step 2: Auth Settings */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-3">
                Dominio Autenticazione
              </label>
              <input
                type="text"
                value={formData.authDomain}
                onChange={(e) => handleInputChange('authDomain', e.target.value)}
                placeholder="es. volontari.it"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Facoltativo. Se impostato, gli utenti con questo dominio email potranno accedere automaticamente.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-3">
                Modalità Iscrizione
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="domainSignupMode"
                    value="invite_only"
                    checked={formData.domainSignupMode === 'invite_only'}
                    onChange={(e) => handleInputChange('domainSignupMode', e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-slate-300">Solo su invito</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="domainSignupMode"
                    value="open"
                    checked={formData.domainSignupMode === 'open'}
                    onChange={(e) => handleInputChange('domainSignupMode', e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-slate-300">Aperta</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Admin Account */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Email Amministratore *
              </label>
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                disabled={!!googlePreFill}
                placeholder="admin@volontari.it"
                className={`w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                  googlePreFill ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              />
            </div>

            {googlePreFill ? (
              <div className="p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
                <p className="text-blue-200 text-sm">
                  ✓ Accederai con Google — nessuna password necessaria
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                    placeholder="Min 8 caratteri"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Conferma Password *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Conferma"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: Summary */}
        {currentStep === 4 && (
          <div className="space-y-4 text-slate-300 text-sm">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <p className="font-medium text-slate-100 mb-2">Organizzazione</p>
              <p>{formData.orgName} ({formData.shortName})</p>
              <p className="text-xs text-slate-400 mt-1">Slug: {formData.slug}</p>
            </div>

            <div className="bg-slate-700/50 p-4 rounded-lg">
              <p className="font-medium text-slate-100 mb-2">Configurazione</p>
              <p>Dominio: {formData.authDomain || 'Non impostato'}</p>
              <p className="text-xs text-slate-400 mt-1">
                Modalità iscrizione: {formData.domainSignupMode === 'invite_only' ? 'Solo su invito' : 'Aperta'}
              </p>
            </div>

            <div className="bg-slate-700/50 p-4 rounded-lg">
              <p className="font-medium text-slate-100 mb-2">Amministratore</p>
              <p>{formData.adminEmail}</p>
            </div>

            <p className="text-xs text-slate-400 italic">
              Puoi modificare questi dettagli dalle impostazioni dopo l'accesso.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Indietro
            </button>
          )}

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Avanti
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading ? 'Configurazione...' : 'Crea Organizzazione'}
            </button>
          )}
        </div>

        {/* Dev/Testing Section */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-500 font-medium mb-3">Testing</p>
          <button
            onClick={handleQuickSetup}
            disabled={loading}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 text-sm rounded-lg transition-colors"
          >
            {loading ? 'Creazione in corso...' : 'Quick Setup (Test Org)'}
          </button>
        </div>
      </div>
    </div>
  );
}
