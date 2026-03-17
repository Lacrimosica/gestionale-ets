import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Users, Calendar, AlertTriangle, ChevronRight, FileText, UserPlus, UserMinus } from 'lucide-react';
import axios from 'axios';
import { useBranding } from '../hooks/useBranding';

import { API_BASE_URL } from '../config';

interface Assembly {
  id: string;
  type: string;
  totalNumber: number;
  firstCallDate?: string | null;
  convocationDate?: string | null;
  location: string;
  assemblyStatus?: string | null;
}

interface TimelineEvent {
  id: string;
  type: string;
  label: string;
  start: string;
  end?: string;
  subType?: string;
}

interface ComplianceSummary {
  totalActiveAlerts: number;
  totalSuppressedAlerts: number;
}

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { branding } = useBranding();
  const [activeVolunteersCount, setActiveVolunteersCount] = useState<number | null>(null);
  const [activeMembersCount, setActiveMembersCount] = useState<number | null>(null);
  const [nextAssembly, setNextAssembly] = useState<Assembly | null>(null);
  const [recentEvents, setRecentEvents] = useState<TimelineEvent[]>([]);
  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().split('T')[0];

        const [volunteersRes, membersRes, assembliesRes, timelineRes, complianceRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/periods/volunteers/active`),
          axios.get(`${API_BASE_URL}/periods/members/active`),
          axios.get<Assembly[]>(`${API_BASE_URL}/assemblies`),
          axios.get<{ events: TimelineEvent[] }>(`${API_BASE_URL}/timeline`),
          axios.get<ComplianceSummary>(`${API_BASE_URL}/compliance/summary`),
        ]);

        setActiveVolunteersCount(Array.isArray(volunteersRes.data) ? volunteersRes.data.length : 0);
        setActiveMembersCount(Array.isArray(membersRes.data) ? membersRes.data.length : 0);

        const assemblies: Assembly[] = assembliesRes.data || [];
        const future = assemblies
          .filter(a => {
            const d = a.firstCallDate || a.convocationDate;
            return d && d >= today && a.assemblyStatus !== 'held';
          })
          .sort((a, b) => {
            const da = a.firstCallDate || a.convocationDate || '';
            const db = b.firstCallDate || b.convocationDate || '';
            return da.localeCompare(db);
          });
        setNextAssembly(future[0] || null);

        const events: TimelineEvent[] = timelineRes.data?.events || [];
        // The API returns events sorted by date ASC, we want the most recent ones first
        setRecentEvents([...events].reverse().slice(0, 10));
        setComplianceSummary(complianceRes.data);
      } catch (err) {
        setError(t('dashboard.errorLoading', { defaultValue: 'Error loading dashboard data' }));
        setActiveVolunteersCount(0);
        setActiveMembersCount(0);
        setRecentEvents([]);
        setComplianceSummary({ totalActiveAlerts: 0, totalSuppressedAlerts: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [t]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const eventIcon = (type: string) => {
    if (type === 'assembly') return <FileText size={16} className="text-purple-400 shrink-0" />;
    if (type === 'member_admission') return <UserPlus size={16} className="text-green-400 shrink-0" />;
    if (type === 'member_resignation') return <UserMinus size={16} className="text-amber-400 shrink-0" />;
    return <Activity size={16} className="text-slate-400 shrink-0" />;
  };

  const stats = [
    {
      label: t('dashboard.activeVolunteers', { defaultValue: 'Active Volunteers' }),
      value: loading ? '—' : String(activeVolunteersCount ?? 0),
      icon: Users,
      color: 'text-blue-400',
      href: '/people?filter=active_volunteers', // Assuming we add this filter or just /people
    },
    {
      label: t('dashboard.activeMembers', { defaultValue: 'Active Members' }),
      value: loading ? '—' : String(activeMembersCount ?? 0),
      icon: Activity,
      color: 'text-green-400',
      href: '/people?filter=active_members',
    },
    {
      label: t('dashboard.nextAssembly', { defaultValue: 'Next Assembly' }),
      value: loading ? '—' : nextAssembly
        ? formatDate(nextAssembly.firstCallDate || nextAssembly.convocationDate || '')
        : t('dashboard.notScheduled', { defaultValue: 'Not scheduled' }),
      icon: Calendar,
      color: 'text-purple-400',
      href: nextAssembly ? `/assemblies` : undefined,
    },
    {
      label: 'Alerts',
      value: loading
        ? '—'
        : complianceSummary && complianceSummary.totalActiveAlerts > 0
          ? String(complianceSummary.totalActiveAlerts)
          : t('common.none', { defaultValue: 'None' }),
      icon: AlertTriangle,
      color: 'text-yellow-400',
      href: '/compliance',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-2">
          {t('dashboard.welcome', { 
            defaultValue: 'Welcome to the management system of {{name}}.', 
            name: branding.organizationName 
          })}
        </p>
      </div>

      {error && (
        <div className="bg-amber-900/20 border border-amber-800 text-amber-200 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Wrapper: any = stat.href ? Link : 'div';
          const wrapperProps = stat.href ? { to: stat.href } : {};
          return (
            <Wrapper
              key={i}
              {...wrapperProps}
              className={`bg-slate-900 border border-slate-800 p-6 rounded-xl transition-colors ${stat.href ? 'hover:border-slate-600 cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon size={24} className={stat.color} />
                <span className="text-xs font-semibold px-2 py-1 bg-slate-800 rounded text-slate-300">
                  {t('common.today', { defaultValue: 'Today' })}
                </span>
              </div>
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              {stat.href && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  {t('common.go', { defaultValue: 'Go' })} <ChevronRight size={12} />
                </p>
              )}
            </Wrapper>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          {t('dashboard.recentActivity', { defaultValue: 'Recent Activity' })}
        </h2>
        {loading ? (
          <div className="text-slate-500 py-8 flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
            {t('common.loading')}
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="text-slate-400 text-center py-12 border-2 border-dashed border-slate-800 rounded-lg">
            {t('dashboard.noRecentActivity', { defaultValue: 'No recent activity recorded.' })}
          </div>
        ) : (
          <ul className="space-y-3">
            {recentEvents.map((ev) => (
              <li key={ev.id} className="flex items-center gap-3 py-2 border-b border-slate-800/80 last:border-0">
                {eventIcon(ev.type)}
                <div className="min-w-0 flex-1">
                  <p className="text-slate-200 text-sm truncate">{ev.label}</p>
                  <p className="text-slate-500 text-xs">{formatDate(ev.start)}</p>
                </div>
                <Link
                  to="/timeline"
                  className="text-slate-500 hover:text-slate-300 shrink-0"
                  title={t('dashboard.goToTimeline', { defaultValue: 'Go to timeline' })}
                >
                  <ChevronRight size={16} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
