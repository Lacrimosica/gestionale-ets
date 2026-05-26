import { type DocumentSettings } from '../../hooks/useSettings';

interface StatuteArticlesFieldsProps {
  articles: {
    statuteArticleConvocation: string | null;
    statuteArticleProxies: string | null;
    statuteArticleMembers: string | null;
    statuteArticleBoardVote: string | null;
    statuteArticleBoardElection: string | null;
  };
  onFormChange: (field: keyof DocumentSettings, value: any) => void;
}

const StatuteArticlesFields = ({ articles, onFormChange }: StatuteArticlesFieldsProps) => {
  const articleFields = [
    ['statuteArticleConvocation', 'Convocation & voting rules', 'art. 9'],
    ['statuteArticleProxies', 'Proxy rules', 'art. 9'],
    ['statuteArticleMembers', 'Member admission & exclusion', 'art. 6'],
    ['statuteArticleBoardVote', 'Board vote restriction', 'art. 10'],
    ['statuteArticleBoardElection', 'Board election rules', 'art. 12'],
  ] as [keyof DocumentSettings, string, string][];

  return (
    <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Statute Articles</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {articleFields.map(([field, label, placeholder]) => (
          <label key={field} className="block">
            <span className="block text-xs text-slate-500 mb-1">{label}</span>
            <input
              value={(articles[field as keyof typeof articles] as string) ?? ''}
              onChange={(e) => onFormChange(field, e.target.value)}
              placeholder={placeholder}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            />
            {(articles[field as keyof typeof articles] as string) && (
              <p className="text-xs text-slate-500 mt-1 italic">→ "ai sensi dell'{articles[field as keyof typeof articles] as string} dello statuto..."</p>
            )}
          </label>
        ))}
      </div>
    </div>
  );
};

export default StatuteArticlesFields;
