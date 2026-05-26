import { useTranslation } from 'react-i18next';
import { Briefcase } from 'lucide-react';

interface BoardRole {
  member: {
    id: string;
    role: string;
    notes?: string;
  };
  generation: {
    name: string;
    startDate: string;
    endDate?: string;
  };
}

interface Person {
  id: string;
  boardRoles?: BoardRole[];
}

interface BoardTabProps {
  person: Person;
}

const BoardTab = ({ person }: BoardTabProps) => {
  const { t } = useTranslation();

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <Briefcase className="text-blue-400" />
          <span>{t('people.boardHistory', { defaultValue: 'Board History' })}</span>
        </h3>
      </div>

      <div className="space-y-4 mt-6">
        {person.boardRoles?.slice().sort((a, b) => new Date(b.generation.startDate).getTime() - new Date(a.generation.startDate).getTime()).map(role => (
          <div key={role.member.id} className="border border-slate-800 bg-slate-950/50 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg bg-blue-900/10 text-blue-400 border border-blue-900/50">
                <Briefcase size={20} />
              </div>
              <div>
                <div className="font-bold text-white text-lg flex items-center space-x-2">
                  <span>{role.member.role}</span>
                </div>
                <div className="text-sm text-slate-400 mt-0.5">
                  {t('people.mandate', { defaultValue: 'Mandate' })}: <span className="text-slate-300 font-medium">{role.generation.name}</span> ({new Date(role.generation.startDate).toISOString().split('T')[0]}{role.generation.endDate ? ` → ${new Date(role.generation.endDate).toISOString().split('T')[0]}` : ` → ${t('common.status.ongoing', { defaultValue: 'In Progress' })}`})
                </div>
              </div>
            </div>
            {role.member.notes && (
              <div className="text-xs text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 self-start md:self-center">
                <span className="font-bold text-slate-500 mr-1">{t('common.fields.notes')}:</span> {role.member.notes}
              </div>
            )}
          </div>
        ))}
        {(!person.boardRoles || person.boardRoles.length === 0) && (
          <div className="text-center py-12 text-slate-500 italic flex flex-col items-center justify-center space-y-3">
            <Briefcase size={32} className="opacity-20" />
            <p>{t('people.noBoardHistory', { defaultValue: 'This person has never been part of the Board.' })}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardTab;
