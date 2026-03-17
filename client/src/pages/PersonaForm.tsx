import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersone, type Person } from '../hooks/usePersone';
import { ArrowLeft, Save, User, MapPin, Briefcase } from 'lucide-react';

const PersonaForm = () => {
  const navigate = useNavigate();
  const { addPerson } = usePersone();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    memberNumber: '',
    notes: ''
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Partial<Person>) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await addPerson(formData);
      navigate('/persone');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
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
        <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded-lg flex items-center space-x-3">
          <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse"></div>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Anagrafica */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center space-x-2 text-blue-400 pb-2 border-b border-slate-800/50">
            <User size={18} />
            <h2 className="font-semibold uppercase tracking-wider text-sm">Dati Personali</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Nome</label>
              <input
                required
                name="firstName"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Cognome</label>
              <input
                required
                name="lastName"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Codice Fiscale</label>
              <input
                name="taxId"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono uppercase focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.taxId}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Genere</label>
              <select
                name="gender"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.birthDate}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Luogo</label>
              <input
                name="birthPlace"
                placeholder="Comune o Città"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.birthPlace}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Paese</label>
              <input
                name="birthCountry"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.birthCountry}
                onChange={handleChange}
              />
            </div>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Telefono</label>
              <input
                type="tel"
                name="phone"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Professione</label>
              <input
                name="profession"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.profession}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Matricola</label>
              <input
                name="memberNumber"
                placeholder="ID Interno"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
                value={formData.memberNumber}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/40"
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
    </div>
  );
};

export default PersonaForm;
