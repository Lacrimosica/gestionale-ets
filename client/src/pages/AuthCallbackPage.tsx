import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSetupStatus } from '../hooks/useSetupStatus';

type Mode = 'login' | 'drive';

type CallbackResult =
  | { kind: 'error'; message: string }
  | { kind: 'login'; token: string; user: unknown }
  | { kind: 'drive' };

/**
 * Read the OAuth redirect once, on mount. The server puts the session in the URL
 * fragment so it never reaches a server log or Referer header; the query fallback
 * covers a server not yet upgraded.
 */
function readCallback(mode: Mode, searchParams: URLSearchParams): CallbackResult {
  const errorParam = searchParams.get('error');
  if (errorParam) return { kind: 'error', message: decodeURIComponent(errorParam) };

  if (mode === 'drive') {
    return searchParams.get('success') === '1'
      ? { kind: 'drive' }
      : { kind: 'error', message: 'Autorizzazione Google Drive non riuscita.' };
  }

  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const token = fragment.get('token') ?? searchParams.get('token');
  const userRaw = fragment.get('user') ?? searchParams.get('user');
  if (!token || !userRaw) return { kind: 'error', message: 'Risposta di autenticazione non valida.' };
  try {
    return { kind: 'login', token, user: JSON.parse(decodeURIComponent(userRaw)) };
  } catch {
    return { kind: 'error', message: 'Impossibile elaborare la risposta di autenticazione.' };
  }
}

const AuthCallbackPage = ({ mode }: { mode: Mode }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { deploymentMode } = useSetupStatus();
  const [result] = useState(() => readCallback(mode, searchParams));
  const error = result.kind === 'error' ? result.message : null;
  const success = result.kind === 'drive';

  // login() is recreated on every AuthProvider render, so guard against re-running.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    // Drop the token from the address bar and history as soon as it has been read.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);

    if (result.kind === 'login') {
      login(result.token, result.user as Parameters<typeof login>[1]);
      navigate('/', { replace: true });
    } else if (result.kind === 'drive') {
      setTimeout(() => navigate('/documents', { replace: true }), 1500);
    }
  }, [result, login, navigate]);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full">
        {!error && !success && (
          <>
            <Loader2 size={36} className="text-accent-400 animate-spin" />
            <p className="text-neutral-300 font-medium">
              {mode === 'login' ? 'Accesso in corso…' : 'Autorizzazione Google Drive…'}
            </p>
          </>
        )}

        {success && (
          <>
            <CheckCircle2 size={36} className="text-success-400" />
            <p className="text-neutral-200 font-semibold text-center">Google Drive collegato.</p>
            <p className="text-neutral-500 text-sm">Redirect in corso…</p>
          </>
        )}

        {error && (
          <>
            <AlertCircle size={36} className="text-danger-400" />
            <p className="text-neutral-200 font-semibold text-center">Errore di autenticazione</p>
            <p className="text-sm text-danger-300 text-center">{error}</p>
            <div className="mt-4 flex flex-col gap-2 w-full">
              <button
                onClick={() => navigate(mode === 'login' ? '/' : '/documents', { replace: true })}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium transition-all"
              >
                Torna {mode === 'login' ? 'al login' : 'ai documenti'}
              </button>
              {mode === 'login' && deploymentMode !== 'single_org' && deploymentMode !== 'closed' && (
                <button
                  onClick={() => navigate('/signup', { replace: true })}
                  className="px-5 py-2.5 rounded-xl bg-accent-700 hover:bg-accent-600 text-white text-sm font-medium transition-all"
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
