import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Send, Copy, Loader } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

interface InviteUserModalProps {
  onClose: () => void;
}

export default function InviteUserModal({ onClose }: InviteUserModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const roleOptions = [
    { value: 'admin', label: t('settings.inviteUser.roles.admin') },
    { value: 'manager', label: t('settings.inviteUser.roles.manager') },
    { value: 'viewer', label: t('settings.inviteUser.roles.viewer') },
  ];

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/invites`, {
        email: email || null,
        role,
      });

      setGeneratedUrl(response.data.url);
      setEmail('');
      setRole('viewer');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(t('settings.inviteUser.errorCreating'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleNewInvite = () => {
    setGeneratedUrl('');
    setError('');
  };

  if (generatedUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{t('settings.inviteUser.createdTitle')}</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">
              ✕
            </button>
          </div>

          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <p className="text-green-200 text-sm mb-4">
              {t('settings.inviteUser.createdMessage')}
            </p>

            <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 break-all font-mono text-sm text-slate-300 mb-4">
              {generatedUrl}
            </div>

            <button
              onClick={handleCopyUrl}
              className="w-full inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Copy size={16} />
              {copySuccess ? t('settings.inviteUser.copiedButton') : t('settings.inviteUser.copyButton')}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleNewInvite}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {t('settings.inviteUser.newInviteButton')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {t('settings.inviteUser.closeButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Mail size={18} className="text-cyan-400" />
            {t('settings.inviteUser.title')}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('settings.inviteUser.emailLabel')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-1">
              {t('settings.inviteUser.emailHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('settings.inviteUser.roleLabel')}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white disabled:opacity-50"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-300">
            <p className="font-medium text-white mb-2">{t('settings.inviteUser.howItWorks')}</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>{t('settings.inviteUser.step1')}</li>
              <li>{t('settings.inviteUser.step2')}</li>
              <li>{t('settings.inviteUser.step3')}</li>
              <li>{t('settings.inviteUser.step4')}</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              {loading ? t('common.status.saving') : t('settings.inviteUser.createButton')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 text-slate-400 hover:text-white disabled:opacity-50"
            >
              {t('settings.inviteUser.cancelButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
