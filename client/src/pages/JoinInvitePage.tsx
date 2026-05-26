import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Check, X, Loader } from 'lucide-react';

interface InviteData {
  id: string;
  orgId: string;
  orgName: string;
  email: string | null;
  role: string;
  expiresAt: string;
}

export default function JoinInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const validateInvite = async () => {
      if (!token) {
        setError('Token invite mancante.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`/api/auth/invites/${encodeURIComponent(token)}`);
        setInvite(response.data);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError('Impossibile convalidare l\'invito.');
        }
      } finally {
        setLoading(false);
      }
    };

    validateInvite();
  }, [token]);

  const handleAccept = () => {
    setAccepting(true);
    // Redirect to Google login with invite token
    const redirectUrl = `/api/auth/google?inviteToken=${encodeURIComponent(token!)}`;
    window.location.href = redirectUrl;
  };

  const handleDecline = () => {
    navigate('/');
  };

  const roleLabels: Record<string, string> = {
    core_admin: 'Amministratore Principale',
    admin: 'Amministratore',
    manager: 'Gestore',
    viewer: 'Visualizzatore',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-slate-400">Convalida invito in corso...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-900/20 mx-auto mb-6">
            <X className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Invito Non Valido</h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            {error || 'L\'invito non è stato trovato o è scaduto.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-cyan-900/20 mx-auto mb-6">
          <Check className="w-6 h-6 text-cyan-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 text-center">Sei Stato Invitato!</h1>
        <p className="text-slate-400 text-sm text-center mb-8">
          Sei stato invitato a unirti a un'organizzazione.
        </p>

        <div className="space-y-4 mb-8">
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Organizzazione</p>
            <p className="text-lg font-semibold text-white">{invite.orgName}</p>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Ruolo</p>
            <p className="text-lg font-semibold text-cyan-400">
              {roleLabels[invite.role] || invite.role}
            </p>
          </div>

          {invite.email && (
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Email</p>
              <p className="text-sm text-slate-300">{invite.email}</p>
            </div>
          )}

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Scadenza</p>
            <p className="text-sm text-slate-300">
              {new Date(invite.expiresAt).toLocaleString('it-IT', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {accepting ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Accetta Invito
          </button>
          <button
            onClick={handleDecline}
            disabled={accepting}
            className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Rifiuta
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-6">
          Accettando questo invito, accederai con il tuo account Google o email.
        </p>
      </div>
    </div>
  );
}
