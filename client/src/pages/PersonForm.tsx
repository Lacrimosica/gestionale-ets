import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePeople, type Person } from '../hooks/usePeople';
import { ArrowLeft, Save, User, MapPin, Briefcase, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/auth-context';
import { PERMISSIONS } from '../lib/permissions';
import CountryCombobox from '../components/CountryCombobox';
import CreateUserForPersonModal from '../components/people/CreateUserForPersonModal';
import { useBranding } from '../hooks/branding-context';
import { useCodiceFiscaleValidation } from '../hooks/useCodiceFiscaleValidation';
import { API_BASE_URL } from '../config';
import axios from 'axios';

const PersonForm = () => {
  const { t } = useTranslation();
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
      setEmailError(t('people.form.invalidEmail'));
    } else {
      setEmailError(null);
    }

    if (formData.email) {
      try {
        const { data: people } = await axios.get<Person[]>(`${API_BASE_URL}/people`);
        const duplicate = formData.email ? people.find(p => p.email?.toLowerCase() === formData.email!.toLowerCase()) : null;
        if (duplicate) {
          setEmailWarning(t('people.form.duplicateEmail', { name: `${duplicate.firstName} ${duplicate.lastName}` }));
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
      setCfError(t('people.form.invalidTaxId'));
    } else {
      setCfError(null);
    }

    if (formData.taxId) {
      try {
        const { data: people } = await axios.get<Person[]>(`${API_BASE_URL}/people`);
        const duplicate = formData.taxId ? people.find(p => p.taxId?.toUpperCase() === formData.taxId!.toUpperCase()) : null;
        if (duplicate) {
          setCfWarning(t('people.form.duplicateTaxId', { name: `${duplicate.firstName} ${duplicate.lastName}` }));
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
      setError(err instanceof Error ? err.message : t('people.form.genericError'));
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
          className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-fg"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-fg">{t('people.form.title')}</h1>
          <p className="text-neutral-400 mt-1">{t('people.form.description')}</p>
        </div>
      </div>

      {error && (
        <div ref={errorRef} className="bg-danger-900/20 border border-danger-900 text-danger-400 px-4 py-3 rounded-lg flex items-center space-x-3">
          <div className="w-1 h-1 bg-danger-400 rounded-full animate-pulse"></div>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Anagrafica */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center space-x-2 text-info-400 pb-2 border-b border-neutral-800/50">
            <User size={18} />
            <h2 className="font-semibold uppercase tracking-wider text-sm">{t('people.personalDetails')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">
                {t('people.form.firstName')} <span className="text-danger-500">*</span>
              </label>
              <input
                required
                name="firstName"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-info-600 outline-none"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">
                {t('people.form.lastName')} <span className="text-danger-500">*</span>
              </label>
              <input
                required
                name="lastName"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-info-600 outline-none"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-neutral-400">{t('people.taxId')}</label>
              <input
                name="taxId"
                className={`w-full bg-neutral-950 border rounded-lg p-2.5 text-neutral-200 font-mono uppercase focus:ring-2 focus:ring-info-600 outline-none ${cfError ? 'border-danger-700' : cfValidation.valid && formData.taxId && formData.taxId.length === 16 ? 'border-success-700' : 'border-neutral-800'}`}
                value={formData.taxId}
                onChange={handleChange}
                onBlur={handleCFBlur}
              />
              {cfError && (
                <p className="text-xs text-danger-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {cfError}
                </p>
              )}
              {cfWarning && (
                <p className="text-xs text-warning-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {cfWarning}
                </p>
              )}
              {formData.taxId && formData.taxId.length === 16 && !cfError && (
                <div className="mt-3 space-y-2 bg-neutral-950/50 border border-neutral-700 rounded p-3">
                  <p className="text-xs font-semibold text-neutral-300 mb-2">{t('people.form.taxIdValidationTitle')}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-2 ${cfValidation.details.lastName ? 'text-success-400' : 'text-danger-400'}`}>
                      {cfValidation.details.lastName ? <Check size={12} /> : <X size={12} />}
                      <span>{t('people.form.lastName')}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${cfValidation.details.firstName ? 'text-success-400' : 'text-danger-400'}`}>
                      {cfValidation.details.firstName ? <Check size={12} /> : <X size={12} />}
                      <span>{t('people.form.firstName')}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${cfValidation.details.birthYear ? 'text-success-400' : 'text-danger-400'}`}>
                      {cfValidation.details.birthYear ? <Check size={12} /> : <X size={12} />}
                      <span>{t('people.form.birthYear')}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${cfValidation.details.birthMonth ? 'text-success-400' : 'text-danger-400'}`}>
                      {cfValidation.details.birthMonth ? <Check size={12} /> : <X size={12} />}
                      <span>{t('people.form.birthMonth')}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${cfValidation.details.birthDay ? 'text-success-400' : 'text-danger-400'}`}>
                      {cfValidation.details.birthDay ? <Check size={12} /> : <X size={12} />}
                      <span>{t('people.form.birthDayGender')}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${cfValidation.details.birthPlace ? 'text-success-400' : 'text-danger-400'}`}>
                      {cfValidation.details.birthPlace ? <Check size={12} /> : <X size={12} />}
                      <span>{t('people.form.birthPlace')}</span>
                    </div>
                    <div className={`flex items-center gap-2 col-span-2 ${cfValidation.details.control ? 'text-success-400' : 'text-danger-400'}`}>
                      {cfValidation.details.control ? <Check size={12} /> : <X size={12} />}
                      <span>{t('people.form.checkCharacter')}</span>
                    </div>
                  </div>
                </div>
              )}
              <details className="mt-2 cursor-pointer">
                <summary className="text-xs text-neutral-400 hover:text-neutral-300 font-medium">
                  ℹ️ {t('people.form.taxIdInformation')}
                </summary>
                <div className="mt-2 text-xs text-neutral-300 bg-neutral-950/50 border border-neutral-700 rounded p-3 space-y-1">
                  <p><strong>{t('people.form.format')}:</strong> {t('people.form.taxIdFormat')}</p>
                  <p><strong>{t('people.form.birthInItaly')}:</strong> {t('people.form.italianTaxIdInfo')}</p>
                  <p><strong>{t('people.form.birthAbroad')}:</strong> {t('people.form.foreignTaxIdInfo')}</p>
                  <p className="text-neutral-400">{t('people.form.taxIdLocationHint')}</p>
                </div>
              </details>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">{t('people.gender')}</label>
              <select
                name="gender"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-info-600 outline-none"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">{t('common.fields.select')}</option>
                <option value="M">{t('people.form.genderOptions.male')}</option>
                <option value="F">{t('people.form.genderOptions.female')}</option>
                <option value="Altro">{t('people.form.genderOptions.other')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section: Nascita */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center space-x-2 text-accent-400 pb-2 border-b border-neutral-800/50">
            <MapPin size={18} />
            <h2 className="font-semibold uppercase tracking-wider text-sm">{t('people.form.birthDetails')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">{t('people.form.birthDate')}</label>
              <input
                type="date"
                name="birthDate"
                max={new Date().toISOString().split('T')[0]}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-info-600 outline-none"
                value={formData.birthDate}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">{t('people.form.birthPlace')}</label>
              <input
                name="birthPlace"
                placeholder={t('people.form.cityPlaceholder')}
                disabled={!!formData.birthCountry && formData.birthCountry !== 'Italia'}
                className={`w-full rounded-lg p-2.5 focus:ring-2 focus:ring-info-600 outline-none ${
                  formData.birthCountry && formData.birthCountry !== 'Italia'
                    ? 'bg-neutral-950/50 border border-neutral-700 text-neutral-500 cursor-not-allowed'
                    : 'bg-neutral-950 border border-neutral-800 text-neutral-200'
                }`}
                value={formData.birthPlace}
                onChange={handleChange}
              />
              {formData.birthCountry && formData.birthCountry !== 'Italia' && (
                <p className="text-xs text-neutral-400">
                  💡 {t('people.form.foreignBirthPlaceHint')}
                </p>
              )}
            </div>
            <CountryCombobox
              value={formData.birthCountry || 'Italia'}
              onChange={handleCountryChange}
              label={t('people.form.country')}
            />
          </div>
        </div>

        {/* Section: Altro */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center space-x-2 text-special-400 pb-2 border-b border-neutral-800/50">
            <Briefcase size={18} />
            <h2 className="font-semibold uppercase tracking-wider text-sm">{t('people.form.contactAndWork')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">{t('people.form.email')}</label>
              <input
                type="email"
                name="email"
                className={`w-full bg-neutral-950 border rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-info-600 outline-none ${emailError ? 'border-danger-700' : 'border-neutral-800'}`}
                value={formData.email}
                onChange={handleChange}
                onBlur={handleEmailBlur}
              />
              {emailError && (
                <p className="text-xs text-danger-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {emailError}
                </p>
              )}
              {emailWarning && (
                <p className="text-xs text-warning-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {emailWarning}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">{t('people.phone')}</label>
              <input
                type="tel"
                name="phone"
                placeholder="+39 XXX XXX XXXX"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-info-600 outline-none"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">{t('people.profession')}</label>
              <input
                name="profession"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-info-600 outline-none"
                value={formData.profession}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-3">
              <span className="text-sm font-medium text-neutral-400">{t('people.occupationStatus')}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isStudent"
                    checked={!!formData.isStudent}
                    onChange={handleChange}
                    className="h-4 w-4 text-info-500 rounded"
                  />
                  <span>{t('people.student')}</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isEmployee"
                    checked={!!formData.isEmployee}
                    onChange={handleChange}
                    className="h-4 w-4 text-info-500 rounded"
                  />
                  <span>{t('people.employee')}</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">{t('people.matricola')}</label>
              <input
                name="memberNumber"
                placeholder={t('people.form.internalIdPlaceholder')}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-info-600 outline-none"
                value={formData.memberNumber}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Section: Note Interne */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center space-x-2 text-neutral-400 pb-2 border-b border-neutral-800/50">
            <AlertCircle size={18} />
            <h2 className="font-semibold uppercase tracking-wider text-sm">{t('people.form.internalNotes')}</h2>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">{t('common.fields.notes')}</label>
            <textarea
              name="notes"
              placeholder={t('people.form.notesPlaceholder')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-info-600 outline-none resize-none h-24"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
            <p className="text-xs text-neutral-500">💡 {t('people.form.notesHint')}</p>
          </div>
        </div>

        {/* Flow Hint */}
        <div className="bg-info-900/20 border border-info-800/50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-info-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-info-300">
            <p className="font-medium mb-1">{t('people.form.nextStep')}</p>
            <p className="text-info-400/80">{t('people.form.nextStepDescription')}</p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-info-600 hover:bg-info-500 disabled:bg-info-800 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-info-900/40"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Save size={20} />
            )}
            <span>{t('people.form.savePerson')}</span>
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
