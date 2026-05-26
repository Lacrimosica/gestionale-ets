import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { formatDate } from '../lib/date-utils';
import { 
  UserMinus, 
  Search, 
  AlertCircle,
  Calendar,
  CheckCircle2,
  Loader2,
  Trash2,
  ShieldCheck
} from 'lucide-react';

import { API_BASE_URL } from '../config';

const ResignationsList = () => {
  const { t } = useTranslation();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/periods/members/active`);
      setMembers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Assuming members list contains individuals from member_period
      const endpoint = `/periods/members/${selectedPerson.period.id}/resignation`;
      
      const payload = { 
        resignationDate: resignationDate, 
        exitReason: reason 
      };

      await axios.patch(`${API_BASE_URL}${endpoint}`, payload);
      
      setMessage({ type: 'success', text: t('resignations.success', { defaultValue: 'Resignation recorded successfully.' }) });
      setSelectedPerson(null);
      setReason('');
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: t('resignations.error', { defaultValue: 'Error recording resignation.' }) });
    } finally {
      setIsSubmitting(false);
    }
  };


  const filteredMembers = members.filter(m => 
    `${m.person.firstName} ${m.person.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 text-slate-500">
      <Loader2 className="animate-spin mb-4" size={32} />
      <p>{t('common.status.loadingActive', { defaultValue: 'Loading active members...' })}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <UserMinus className="text-red-400" />
            <span>{t('nav.resignations', { defaultValue: 'Resignations Management' })}</span>
          </h1>
          <p className="text-slate-400 mt-1">{t('resignations.subtitle', { defaultValue: 'Record the resignation of members from the association.' })}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder={t('common.fields.searchPlaceholder', { defaultValue: 'Search by name or surname...' })}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50"
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2 px-2">
            <ShieldCheck className="text-yellow-400" size={20} />
            <span>{t('common.status.activeMembers', { defaultValue: 'Active Members' })}</span>
            <span className="ml-auto bg-yellow-600/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-500/30">
              {filteredMembers.length}
            </span>
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800 shadow-xl">
            {filteredMembers.length > 0 ? filteredMembers.map((m) => (
              <div key={m.period.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                <div>
                  <div className="font-bold text-white">{m.person.firstName} {m.person.lastName}</div>
                  <div className="text-xs text-slate-500 flex items-center mt-1">
                    <Calendar size={12} className="mr-1" />
                    {t('common.fields.since', { defaultValue: 'Since' })} {formatDate(m.period.admissionDate)}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPerson(m)}
                  className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-red-500/20"
                >
                  {t('common.actions.resign', { defaultValue: 'Resign' })}
                </button>
              </div>
            )) : <div className="p-8 text-center text-slate-500 text-sm italic">{t('common.status.noActiveMembersFound', { defaultValue: 'No active members found' })}</div>}
          </div>
        </div>
      </div>

      {selectedPerson && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-bold text-white mb-2">{t('resignations.recordTitle', { defaultValue: 'Record Resignation' })}</h3>
            <p className="text-slate-400 mb-6">
              {t('resignations.confirmPrompt', { defaultValue: 'You are recording the resignation of {{name}}.', name: `${selectedPerson.person.firstName} ${selectedPerson.person.lastName}` })}
            </p>

            <form onSubmit={handleResign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">{t('common.fields.resignationDate', { defaultValue: 'Resignation Date' })}</label>
                <input
                  type="date"
                  required
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">{t('common.fields.reason', { defaultValue: 'Reason' })}</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={t('resignations.reasonPlaceholder', { defaultValue: 'Write the reason for leaving here...' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedPerson(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all uppercase tracking-wider text-xs"
                >
                  {t('common.actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 uppercase tracking-wider text-xs"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  <span>{t('common.actions.confirm', { defaultValue: 'Confirm' })}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right duration-500 z-50 ${
          message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <span className="font-bold">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-4 opacity-70 hover:opacity-100">×</button>
        </div>
      )}
    </div>
  );
};

export default ResignationsList;
