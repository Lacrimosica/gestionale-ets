import { useTranslation } from 'react-i18next';
import { BellOff } from 'lucide-react';

interface AlertsSectionProps {
  alerts?: any[];
  suppressedAlerts?: any[];
  canEdit: boolean;
  onSuppressAlert: (alertKey: string) => void;
  onReleaseSuppression: (suppressionId: string) => void;
}

const AlertsSection = ({ alerts, suppressedAlerts, canEdit, onSuppressAlert, onReleaseSuppression }: AlertsSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">{t('people.activeAlerts', { defaultValue: 'Active Alerts' })}</h3>
            <p className="text-sm text-slate-400 mt-1">{t('people.activeAlertsSubtitle', { defaultValue: 'Current issues with data or documents.' })}</p>
          </div>
        </div>

        <div className="space-y-3">
          {alerts?.length ? alerts.map((alert: any) => (
            <div key={alert.key} className="border border-amber-900/50 bg-amber-950/20 rounded-lg p-4">
              <div className="font-semibold text-white">{t(alert.title, { label: t(alert.labelKey || '') })}</div>
              <div className="text-sm text-amber-100/80 mt-1">{alert.description}</div>
              {canEdit && (
                <button onClick={() => onSuppressAlert(alert.key)} className="mt-3 text-sm text-amber-300 hover:text-amber-200">
                  {t('people.suppress', { defaultValue: 'Suppress' })}
                </button>
              )}
            </div>
          )) : (
            <div className="text-sm text-slate-500 italic">{t('people.noActiveAlerts', { defaultValue: 'No active alerts.' })}</div>
          )}
        </div>
      </div>

      <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">{t('people.suppressedAlerts', { defaultValue: 'Suppressed Alerts' })}</h3>
            <p className="text-sm text-slate-400 mt-1">{t('people.suppressedAlertsSubtitle', { defaultValue: 'Known issues temporarily excluded.' })}</p>
          </div>
          <BellOff className="text-slate-500" size={18} />
        </div>

        <div className="space-y-3">
          {suppressedAlerts?.length ? suppressedAlerts.map((alert: any) => (
            <div key={alert.key} className="border border-slate-800 bg-slate-900/60 rounded-lg p-4">
              <div className="font-semibold text-white">{t(alert.title, { label: t(alert.labelKey || '') })}</div>
              <div className="text-sm text-slate-400 mt-1">{alert.description}</div>
              <div className="text-xs text-slate-500 mt-2">
                {alert.suppression?.reason}
                {alert.suppression?.note ? ` - ${alert.suppression.note}` : ''}
              </div>
              {canEdit && alert.suppression && (
                <button onClick={() => onReleaseSuppression(alert.suppression!.id)} className="mt-3 text-sm text-blue-300 hover:text-blue-200">
                  {t('people.reactivate', { defaultValue: 'Reactivate' })}
                </button>
              )}
            </div>
          )) : (
            <div className="text-sm text-slate-500 italic">{t('people.noSuppressedAlerts', { defaultValue: 'No suppressed alerts.' })}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsSection;
