import { useState, useRef, useEffect } from 'react';
import { UserPlus, Save, Zap } from 'lucide-react';
import { type Permission } from '../../lib/permissions';
import PermissionChecklist from '../settings/PermissionChecklist';
import { getPermissionsForRole } from '../../lib/permissions';

const normalizeEmailPart = (s: string): string => {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.');
};

interface CreateUserForPersonModalProps {
  personId: string;
  firstName: string;
  lastName: string;
  authDomain?: string;
  onSuccess: () => void;
  onClose: () => void;
}

const CreateUserForPersonModal = ({
  personId,
  firstName,
  lastName,
  authDomain,
  onSuccess,
  onClose,
}: CreateUserForPersonModalProps) => {
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [permissions, setPermissions] = useState<Permission[]>(getPermissionsForRole('viewer'));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  const generateEmailSuggestion = (): string | null => {
    if (!firstName || !lastName || !authDomain) return null;
    return `${normalizeEmailPart(firstName)}.${normalizeEmailPart(lastName)}@${authDomain}`;
  };

  const suggestion = generateEmailSuggestion();

  const handleApplySuggestion = () => {
    if (suggestion) {
      setEmail(suggestion);
    }
  };

  const handleTogglePermission = (permission: Permission) => {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setPermissions(getPermissionsForRole(newRole));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      const response = await fetch(`/api/people/${personId}/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, permissions }),
      });

      if (!response.ok) {
        let errorMessage = 'Error creating user account';
        try {
          const data = await response.json() as { error?: string };
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `Server error (HTTP ${response.status})`;
        }
        setError(errorMessage);
        setSaving(false);
        return;
      }

      setMessage('Account created successfully');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-2xl space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <UserPlus size={18} className="text-cyan-400" />
            Crea Account Utente
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="utente@example.org"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              required
            />
            {suggestion && !email && (
              <button
                type="button"
                onClick={handleApplySuggestion}
                className="inline-flex items-center gap-2 px-2 py-1 bg-amber-900/40 border border-amber-700 rounded text-xs text-amber-200 hover:bg-amber-900/60 transition-colors"
              >
                <Zap size={12} />
                Suggerisci: {suggestion}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Ruolo</label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>

          <PermissionChecklist permissions={permissions} onToggle={handleTogglePermission} />

          {error && <p ref={errorRef} className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-400">{message}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !email || !password}
              className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
            >
              <Save size={16} />
              Crea Account
            </button>
            <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-white">
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserForPersonModal;
