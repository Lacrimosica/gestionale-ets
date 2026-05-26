import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  LayoutDashboard,
  Calendar,
  Settings,
  ShieldCheck,
  LogOut,
  Briefcase,
  PanelLeftClose,
  PanelLeftOpen,
  Languages,
  FileText,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useBranding } from '../hooks/useBranding';
import { PERMISSIONS } from '../lib/permissions';

const Sidebar = ({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const { logout, user, hasPermission } = useAuth();
  const { branding } = useBranding();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'it' ? 'en' : 'it';
    i18n.changeLanguage(nextLang);
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard'), permission: PERMISSIONS.dashboardView },
    { to: '/people', icon: Users, label: t('nav.people'), permission: PERMISSIONS.peopleView },
    { to: '/board', icon: Briefcase, label: t('nav.board'), permission: PERMISSIONS.boardView },
    { to: '/assemblies', icon: Calendar, label: t('nav.assemblies'), permission: PERMISSIONS.assembliesView },
    { to: '/compliance', icon: ShieldCheck, label: t('nav.compliance'), permission: PERMISSIONS.peopleView },
    { to: '/retention', icon: Trash2, label: t('nav.retention'), permission: PERMISSIONS.peopleView },
    { to: '/documents', icon: FileText, label: t('nav.documents'), permission: PERMISSIONS.documentsView },
    { to: '/timeline', icon: Calendar, label: t('nav.timeline'), permission: PERMISSIONS.timelineView },
  ].filter((item) => hasPermission(item.permission));

  return (
    <div
      className={`${collapsed ? 'w-20' : 'w-64'} h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 border-r border-slate-800 transition-all duration-300`}
    >
      <div className={`${collapsed ? 'p-4' : 'p-6'} border-b border-slate-800/70`}>
        <div
          className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3`}
          title={collapsed ? `${branding.shortName} Gestionale - ${branding.name}` : undefined}
        >
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'min-w-0 flex-1'}`}>
            {branding.logoDataUrl ? (
              <img
                src={branding.logoDataUrl}
                alt={`Logo ${branding.name}`}
                className="h-11 w-11 shrink-0 rounded-xl object-cover border border-slate-700 bg-slate-950 p-1"
              />
            ) : (
              <div className="h-11 w-11 shrink-0 rounded-xl border border-blue-500/30 bg-blue-600/10 text-blue-400 flex items-center justify-center font-bold">
                {branding.shortName.slice(0, 2).toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-xl leading-tight font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent break-words">
                  {branding.shortName} Gestionale
                </h1>
                <p className="text-xs text-slate-500 break-words">{branding.name}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={onToggle}
              className="h-9 w-9 shrink-0 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700 transition-colors flex items-center justify-center"
              aria-label={t('common.collapseSidebar', { defaultValue: 'Collapse sidebar' })}
              title={t('common.collapseSidebar', { defaultValue: 'Collapse sidebar' })}
            >
              <span className="sr-only">Collapse</span>
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        {collapsed && (
          <>
            <div className="mt-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {branding.shortName.slice(0, 6)}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="mt-3 h-9 w-full rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700 transition-colors flex items-center justify-center"
              aria-label={t('common.expandSidebar', { defaultValue: 'Expand sidebar' })}
              title={t('common.expandSidebar', { defaultValue: 'Expand sidebar' })}
            >
              <span className="sr-only">Expand</span>
              <PanelLeftOpen size={18} />
            </button>
          </>
        )}

        {!collapsed && user && <p className="text-xs text-slate-500 mt-3 truncate">{user.email}</p>}
      </div>

      <nav className={`flex-1 min-h-0 ${collapsed ? 'px-2' : 'px-4'} space-y-2 mt-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pr-1`}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} ${collapsed ? 'px-2' : 'px-4'} py-3 rounded-lg transition-all duration-200 ${
                isActive
                   ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon size={20} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-slate-800 space-y-1`}>
        {hasPermission(PERMISSIONS.settingsView) && (
          <NavLink
            to="/settings"
            title={collapsed ? t('nav.settings') : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} ${collapsed ? 'px-2' : 'px-4'} py-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Settings size={20} />
            {!collapsed && <span>{t('nav.settings')}</span>}
          </NavLink>
        )}
        <button
          onClick={toggleLanguage}
          title={collapsed ? (i18n.language === 'it' ? 'English' : 'Italiano') : undefined}
          className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} text-slate-400 hover:text-white hover:bg-slate-800 ${collapsed ? 'px-2' : 'px-4'} py-2 w-full transition-all rounded-lg`}
        >
          <Languages size={20} />
          {!collapsed && <span>{i18n.language === 'it' ? 'English' : 'Italiano'}</span>}
        </button>
        <button
          onClick={logout}
          title={collapsed ? t('auth.logout') : undefined}
          className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} text-red-400 hover:text-red-300 hover:bg-red-500/10 ${collapsed ? 'px-2' : 'px-4'} py-2 w-full transition-all rounded-lg`}
        >
          <LogOut size={20} />
          {!collapsed && <span>{t('auth.logout')}</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
