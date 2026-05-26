import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSetupStatus } from '../hooks/useSetupStatus';

type Mode = 'login' | 'drive';

const AuthCallbackPage = ({ mode }: { mode: Mode }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { deploymentMode } = useSetupStatus();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (mode === 'login') {
      const token = searchParams.get('token');
      const userRaw = searchParams.get('user');

      if (!token || !userRaw) {
        setError('Risposta di autenticazione non valida.');
        return;
      }

      try {
        const user = JSON.parse(decodeURIComponent(userRaw));
        login(token, user);
        navigate('/', { replace: true });
      } catch {
        setError('Impossibile elaborare la risposta di autenticazione.');
      }
    }

    if (mode === 'drive') {
      const success = searchParams.get('success');
      if (success === '1') {
        setSuccess(true);
        setTimeout(() => navigate('/documents', { replace: true }), 1500);
      } else {
        setError('Autorizzazione Google Drive non riuscita.');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full">
        {!error && !success && (
          <>
            <Loader2 size={36} className="text-blue-400 animate-spin" />
            <p className="text-slate-300 font-medium">
              {mode === 'login' ? 'Accesso in corso…' : 'Autorizzazione Google Drive…'}
            </p>
          </>
        )}

        {success && (
          <>
            <CheckCircle2 size={36} className="text-emerald-400" />
            <p className="text-slate-200 font-semibold text-center">Google Drive collegato.</p>
            <p className="text-slate-500 text-sm">Redirect in corso…</p>
          </>
        )}

        {error && (
          <>
            <AlertCircle size={36} className="text-red-400" />
            <p className="text-slate-200 font-semibold text-center">Errore di autenticazione</p>
            <p className="text-sm text-red-300 text-center">{error}</p>
            <div className="mt-4 flex flex-col gap-2 w-full">
              <button
                onClick={() => navigate(mode === 'login' ? '/' : '/documents', { replace: true })}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-all"
              >
                Torna {mode === 'login' ? 'al login' : 'ai documenti'}
              </button>
              {mode === 'login' && deploymentMode !== 'single_org' && deploymentMode !== 'closed' && (
                <button
                  onClick={() => navigate('/signup', { replace: true })}
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium transition-all"
                >
                  Crea un'organizzazione
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
