import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "../i18n";
import type { StartupRecoveryReport } from "../types";

interface Props {
  report: StartupRecoveryReport;
  onClose: () => void;
}

export function StartupRecoveryModal({ report, onClose }: Props) {
  const { t, formatError } = useTranslation();
  const hasRestoredPaths = report.restoredPaths.length > 0;
  const hasFailures = report.failures.length > 0;

  return <div className="modal-backdrop">
    <section className={`block-confirmation-modal startup-recovery-modal${hasFailures ? " has-failures" : ""}`} role="dialog" aria-modal="true" aria-labelledby="startup-recovery-title">
      <div className="block-modal-heading">
        {hasFailures ? <AlertTriangle size={22} aria-hidden="true" /> : <CheckCircle2 size={22} aria-hidden="true" />}
        <h2 id="startup-recovery-title">{t(hasFailures ? "startupRecoveryFailureTitle" : "startupRecoveryTitle")}</h2>
      </div>
      {hasRestoredPaths && <>
        <p className="block-modal-scope">{t("startupRecoveryDescription")}</p>
        <ul className="startup-recovery-list">
          {report.restoredPaths.map((path) => <li key={path}><code>{path}</code></li>)}
        </ul>
      </>}
      {report.failures.length > 0 && <>
        <p className="block-modal-scope">{t("startupRecoveryFailedDescription")}</p>
        <ul className="startup-recovery-list">
          {report.failures.map(({ path, detail }) => <li key={path}><code>{path}</code><span>{formatError(detail)}</span></li>)}
        </ul>
      </>}
      <div className="block-modal-actions">
        <button type="button" className="modal-confirm-button" onClick={onClose}>{t("close")}</button>
      </div>
    </section>
  </div>;
}
