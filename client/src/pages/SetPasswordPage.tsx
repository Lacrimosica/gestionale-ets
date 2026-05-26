import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../config';

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const token = searchParams.get('token') || '';
  const isFirst = searchParams.get('first') === '1';

  const [passwordSetComplete, setPasswordSetComplete] = useState(false);

  // Try to decode token to display email (not verified, just for UX)
  const getEmailFromToken = (tokenStr: string) => {
    if (!tokenStr) return '';
    try {
      const parts = tokenStr.split('.');
      if (parts.length !== 3) return '';
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
      const decoded = JSON.parse(atob(padded)) as { email?: string };
      return decoded.email || '';
    } catch {
      return '';
    }
  };

  const email = getEmailFromToken(token);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (passwordSetComplete && isAuthenticated) {
      navigate('/');
    }
  }, [passwordSetComplete, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Entrambi i campi password sono obbligatori.');
      return;
    }

    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non corrispondono.');
      return;
    }

    setLoading(true);

    try {
      if (!token) {
        setError('Token non valido. Accedi di nuovo con Google.');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/auth/set-password`, {
        token,
        password
      });

      const { token: jwtToken, user } = response.data;
      login(jwtToken, user);
      setPasswordSetComplete(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Si è verificato un errore. Riprova.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Imposta Password</h1>
          <p className="text-slate-400 text-sm">
            {isFirst
              ? 'Hai acceduto con Google. Imposta una password per proteggere il tuo account.'
              : 'Imposta una nuova password.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 disabled:opacity-75"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Almeno 8 caratteri"
              disabled={loading}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-75"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Conferma Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ripeti la password"
              disabled={loading}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-75"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
          >
            {loading ? 'Impostazione password...' : 'Continua'}
          </button>
        </form>
      </div>
    </div>
  );
}
