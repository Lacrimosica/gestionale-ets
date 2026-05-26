import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeople, type Person } from '../hooks/usePeople';
import { ArrowLeft, Save, User, MapPin, Briefcase, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PERMISSIONS } from '../lib/permissions';
import CountryCombobox from '../components/CountryCombobox';
import CreateUserForPersonModal from '../components/people/CreateUserForPersonModal';
import { useBranding } from '../hooks/useBranding';
import { useCodiceFiscaleValidation } from '../hooks/useCodiceFiscaleValidation';
import { API_BASE_URL } from '../config';
import axios from 'axios';

const PersonForm = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { addPerson } = usePeople();
  const { branding } = useBranding();
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasPermission(PERMISSIONS.peopleEdit)) {
      navigate('/people', { replace: true });
    }
  }, [hasPermission, navigate]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [cfError, setCfError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [cfWarning, setCfWarning] = useState<string | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [savedPersonId, setSavedPersonId] = useState<string | null>(null);
  const [savedPerson, setSavedPerson] = useState<Person | null>(null);

  const [formData, setFormData] = useState<Partial<Person>>({
    firstName: '',
    lastName: '',
    taxId: '',
    email: '',
    phone: '',
    birthDate: '',
    birthPlace: '',
    birthCountry: 'Italia',
    gender: '',
    profession: '',
    isStudent: false,
    isEmployee: false,
    memberNumber: '',
    notes: ''
  });

  const cfValidation = useCodiceFiscaleValidation(
    formData.taxId || '',
    formData.firstName || '',
    formData.lastName || '',
    formData.birthDate || '',
    formData.gender || '',
  );

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateCF = (cf: string): boolean => {
    if (!cf) return true;
    return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(cf);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    let nextValue: string | boolean = type === 'checkbox' ? checked : value;
    if (name === 'taxId') {
      nextValue = (value as string).toUpperCase();
    }
    setFormData((prev: Partial<Person>) => ({ ...prev, [name]: nextValue }));
  };

  const handleCountryChange = (country: string) => {
    setFormData((prev) => ({
      ...prev,
      birthCountry: country,
      birthPlace: country !== 'Italia' ? '' : prev.birthPlace || '',
    }));
  };

  const handleEmailBlur = async () => {
    if (formData.email && !validateEmail(formData.email)) {
      setEmailError('Inserisci un indirizzo email valido');
    } else {
      setEmailError(null);
    }

    if (formData.email) {
      try {
        const { data: people } = await axios.get<Person[]>(`${API_BASE_URL}/people`);
        const duplicate = formData.email ? people.find(p => p.email?.toLowerCase() === formData.email!.toLowerCase()) : null;
        if (duplicate) {
          setEmailWarning(`Email già utilizzata da ${duplicate.firstName} ${duplicate.lastName}`);
        } else {
          setEmailWarning(null);
        }
      } catch (err) {
        console.error('Error checking email', err);
      }
    }
  };

  const handleCFBlur = async () => {
    if (formData.taxId && !validateCF(formData.taxId)) {
      setCfError('Formato non valido. Il Codice Fiscale deve avere 16 caratteri.');
    } else {
      setCfError(null);
    }

    if (formData.taxId) {
      try {
        const { data: people } = await axios.get<Person[]>(`${API_BASE_URL}/people`);
        const duplicate = formData.taxId ? people.find(p => p.taxId?.toUpperCase() === formData.taxId!.toUpperCase()) : null;
        if (duplicate) {
          setCfWarning(`Codice Fiscale già utilizzato da ${duplicate.firstName} ${duplicate.lastName}`);
        } else {
          setCfWarning(null);
        }
      } catch (err) {
        console.error('Error checking CF', err);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && value === '') {
          return acc;
        }
        return { ...acc, [key]: value };
      }, {} as Partial<Person>);

      const newPerson = await addPerson(cleanData);
      setSavedPersonId(newPerson.id);
      setSavedPerson(newPerson);
      setShowCreateUserModal(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleCreateUserSuccess = () => {
    navigate('/persone');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/persone')}
          className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Nuova Persona</h1>
          <p className="text-slate-400 mt-1">Inserisci i dati anagrafici di base.</p>
        </div>
      </div>

      {error && (
        <div ref={errorRef} className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded-lg flex items-center space-x-3">
          <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse"></div>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Anagrafica */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center space-x-2 text-cyan-400 pb-2 border-b border-slate-800/50">
            <User size={18} />
            <h2 className="font-semibold uppercase tracking-wider text-sm">Dati Personali</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="firstName"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-600 outline-none"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">
                Cognome <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="lastName"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-600 outline-none"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-400">Codice Fiscale</label>
              <input
                name="taxId"
                className={`w-full bg-slate-950 border rounded-lg p-2.5 text-slate-200 font-mono uppercase focus:ring-2 focus:ring-cyan-600 outline-none ${cfError ? 'border-red-700' : cfValidation.valid && formData.taxId && formData.taxId.length === 16 ? 'border-green-700' : 'border-slate-800'}`}
                value={formData.taxId}
                onChange={handleChange}
                onBlur={handleCFBlur}
              />
              {cfError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {cfError}
                </p>
              )}
              {cfWarning && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {cfWarning}
                </p>
              )}
              {formData.taxId && formData.taxId.length === 16 && !cfError && (
                <div className="mt-3 space-y-2 bg-slate-950/50 border border-slate-700 rounded p-3">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Validazione componenti:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-2 ${cfValidation.details.lastName ? 'text-green-400' : 'text-red-400'}`}>
                      {cfValidation.details.lastName ? <Check size={12} /> : <X size={12} />}
                      <span>Cognome</span>
                    </div>
                    <div className={`flex items-center gap-2 ${cfValidation.details.firstName ? 'text-green-400' : 'text-red-400'}`}>
                      {cfValidation.details.firstName ? <Check size={12} /> : <X size={12} />}
                      <span>Nome</span>
                    </div>
                    <div className={`flex items-center gap-2 ${cfValidation.details.birthYear ? 'text-green-400' : 'text-red-400'}`}>
                      {cfValidation.details.birthYear ? <Check size={12} /> : <X size={12} />}
                      <span>Anno nascita</span>
                    </div>
                    <div className={`flex items-center gap-2 ${cfValidation.details.birthMonth ? 'text-green-400' : 'text-red-400'}`}>
                      {cfValidation.details.birthMonth ? <Check size={12} /> : <X size={12} />}
                      <span>Mese nascita</span>
                    </div>
                    <div className={`flex items-center gap-2 ${cfValidation.details.birthDay ? 'text-green-400' : 'text-red-400'}`}>
                      {cfValidation.details.birthDay ? <Check size={12} /> : <X size={12} />}
                      <span>Giorno/sesso</span>
                    </div>
                    <div className={`flex items-center gap-2 ${cfValidation.details.birthPlace ? 'text-green-400' : 'text-red-400'}`}>
                      {cfValidation.details.birthPlace ? <Check size={12} /> : <X size={12} />}
                      <span>Luogo nascita</span>
                    </div>
                    <div className={`flex items-center gap-2 col-span-2 ${cfValidation.details.control ? 'text-green-400' : 'text-red-400'}`}>
                      {cfValidation.details.control ? <Check size={12} /> : <X size={12} />}
                      <span>Carattere di controllo</span>
                    </div>
                  </div>
                </div>
              )}
              <details className="mt-2 cursor-pointer">
                <summary className="text-xs text-slate-400 hover:text-slate-300 font-medium">
                  ℹ️ Informazioni sul Codice Fiscale
                </summary>
                <div className="mt-2 text-xs text-slate-300 bg-slate-950/50 border border-slate-700 rounded p-3 space-y-1">
                  <p><strong>Formato:</strong> 16 caratteri (es. RSSMRA85D13F205F)</p>
                  <p><strong>Per nati in Italia:</strong> Il codice fiscale usa il catastale del comune (es. F205 = Milano)</p>
                  <p><strong>Per nati all'estero:</strong> Il codice fiscale usa il codice estero (inizia con Z + numero, es. Z336 = Iran)</p>
                  <p className="text-slate-400">Inserisci il comune o città nel campo "Luogo" e seleziona il paese nel campo "Paese".</p>
                </div>
              </details>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Genere</label>
              <select
                name="gender"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-600 outline-none"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Seleziona...</option>
                <option value="M">Maschio</option>
                <option value="F">Femmina</option>
                <option value="Altro">Altro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section: Nascita */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center space-x-2 text-indigo-400 pb-2 border-b border-slate-800/50">
            <MapPin size={18} />
            <h2 className="font-semibold uppercase tracking-wider text-sm">Luogo e Data di Nascita</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Data di Nascita</label>
              <input
                type="date"
                name="birthDate"
                max={new Date().toISOString().split('T')[0]}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-600 outline-none"
                value={formData.birthDate}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Luogo</label>
              <input
                name="birthPlace"
                placeholder="Comune o Città"
                disabled={!!formData.birthCountry && formData.birthCountry !== 'Italia'}
                className={`w-full rounded-lg p-2.5 focus:ring-2 focus:ring-cyan-600 outline-none ${
                  formData.birthCountry && formData.birthCountry !== 'Italia'
                    ? 'bg-slate-950/50 border border-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-950 border border-slate-800 text-slate-200'
                }`}
                value={formData.birthPlace}
                onChange={handleChange}
              />
              {formData.birthCountry && formData.birthCountry !== 'Italia' && (
                <p className="text-xs text-slate-400">
                  💡 Il luogo di nascita è impostato automaticamente al paese selezionato. Il codice catastale estero (Z...) sarà calcolato automaticamente.
                </p>
              )}
            </div>
            <CountryCombobox
              value={formData.birthCountry || 'Italia'}
              onChange={handleCountryChange}
              label="Paese"
            />
          </div>
        </div>

        {/* Section: Altro */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center space-x-2 text-purple-400 pb-2 border-b border-slate-800/50">
            <Briefcase size={18} />
            <h2 className="font-semibold uppercase tracking-wider text-sm">Contatti e Lavoro</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Email</label>
              <input
                type="email"
                name="email"
                className={`w-full bg-slate-950 border rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-600 outline-none ${emailError ? 'border-red-700' : 'border-slate-800'}`}
                value={formData.email}
                onChange={handleChange}
                onBlur={handleEmailBlur}
              />
              {emailError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {emailError}
                </p>
              )}
              {emailWarning && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {emailWarning}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Telefono</label>
              <input
                type="tel"
                name="phone"
                placeholder="+39 XXX XXX XXXX"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-600 outline-none"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Professione</label>
              <input
                name="profession"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-600 outline-none"
                value={formData.profession}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-3">
              <span className="text-sm font-medium text-slate-400">Stato occupazionale</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isStudent"
                    checked={!!formData.isStudent}
                    onChange={handleChange}
                    className="h-4 w-4 text-cyan-500 rounded"
                  />
                  <span>Studente</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isEmployee"
                    checked={!!formData.isEmployee}
                    onChange={handleChange}
                    className="h-4 w-4 text-cyan-500 rounded"
                  />
                  <span>Lavoratore</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Matricola</label>
              <input
                name="memberNumber"
                placeholder="ID Interno"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-600 outline-none"
                value={formData.memberNumber}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Section: Note Interne */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center space-x-2 text-slate-400 pb-2 border-b border-slate-800/50">
            <AlertCircle size={18} />
            <h2 className="font-semibold uppercase tracking-wider text-sm">Note Interne</h2>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Note</label>
            <textarea
              name="notes"
              placeholder="Aggiungi note o osservazioni interne su questa persona..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-600 outline-none resize-none h-24"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
            <p className="text-xs text-slate-500">💡 Le note sono visibili solo agli amministratori.</p>
          </div>
        </div>

        {/* Flow Hint */}
        <div className="bg-cyan-900/20 border border-cyan-800/50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-cyan-300">
            <p className="font-medium mb-1">Prossimo passo</p>
            <p className="text-cyan-400/80">Dopo aver salvato la persona, avrai l'opzione di creare un account utente per permettergli di accedere al sistema.</p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-cyan-900/40"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Save size={20} />
            )}
            <span>Salva Persona</span>
          </button>
        </div>
      </form>

      {showCreateUserModal && savedPersonId && savedPerson && (
        <CreateUserForPersonModal
          personId={savedPersonId}
          firstName={savedPerson.firstName}
          lastName={savedPerson.lastName}
          authDomain={branding?.authDomain}
          onSuccess={handleCreateUserSuccess}
          onClose={() => {
            setShowCreateUserModal(false);
            navigate('/persone');
          }}
        />
      )}
    </div>
  );
};

export default PersonForm;
