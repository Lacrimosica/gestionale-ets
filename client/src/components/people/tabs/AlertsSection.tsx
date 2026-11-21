import { useTranslation } from 'react-i18next';
import { BellOff } from 'lucide-react';
import type { ComplianceAlert } from '../../../hooks/useCompliance';

interface AlertsSectionProps {
  alerts?: ComplianceAlert[];
  suppressedAlerts?: ComplianceAlert[];
  canEdit: boolean;
  onSuppressAlert: (alertKey: string) => void;
  onReleaseSuppression: (suppressionId: string) => void;
}

const AlertsSection = ({ alerts, suppressedAlerts, canEdit, onSuppressAlert, onReleaseSuppression }: AlertsSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/40 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-fg">{t('people.activeAlerts', { defaultValue: 'Active Alerts' })}</h3>
            <p className="text-sm text-neutral-400 mt-1">{t('people.activeAlertsSubtitle', { defaultValue: 'Current issues with data or documents.' })}</p>
          </div>
        </div>

        <div className="space-y-3">
          {alerts?.length ? alerts.map((alert) => (
            <div key={alert.key} className="border border-warning-900/50 bg-warning-950/20 rounded-lg p-4">
              <div className="font-semibold text-fg">{t(alert.title, { label: t(alert.labelKey || '') })}</div>
              <div className="text-sm text-warning-100/80 mt-1">{alert.description}</div>
              {canEdit && (
                <button onClick={() => onSuppressAlert(alert.key)} className="mt-3 text-sm text-warning-300 hover:text-warning-200">
                  {t('people.suppress', { defaultValue: 'Suppress' })}
                </button>
              )}
            </div>
          )) : (
            <div className="text-sm text-neutral-500 italic">{t('people.noActiveAlerts', { defaultValue: 'No active alerts.' })}</div>
          )}
        </div>
      </div>

      <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-950/40 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-fg">{t('people.suppressedAlerts', { defaultValue: 'Suppressed Alerts' })}</h3>
            <p className="text-sm text-neutral-400 mt-1">{t('people.suppressedAlertsSubtitle', { defaultValue: 'Known issues temporarily excluded.' })}</p>
          </div>
          <BellOff className="text-neutral-500" size={18} />
        </div>

        <div className="space-y-3">
          {suppressedAlerts?.length ? suppressedAlerts.map((alert) => (
            <div key={alert.key} className="border border-neutral-800 bg-neutral-900/60 rounded-lg p-4">
              <div className="font-semibold text-fg">{t(alert.title, { label: t(alert.labelKey || '') })}</div>
              <div className="text-sm text-neutral-400 mt-1">{alert.description}</div>
              <div className="text-xs text-neutral-500 mt-2">
                {alert.suppression?.reason}
                {alert.suppression?.note ? ` - ${alert.suppression.note}` : ''}
              </div>
              {canEdit && alert.suppression && (
                <button onClick={() => onReleaseSuppression(alert.suppression!.id)} className="mt-3 text-sm text-accent-300 hover:text-accent-200">
                  {t('people.reactivate', { defaultValue: 'Reactivate' })}
                </button>
              )}
            </div>
          )) : (
            <div className="text-sm text-neutral-500 italic">{t('people.noSuppressedAlerts', { defaultValue: 'No suppressed alerts.' })}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsSection;
