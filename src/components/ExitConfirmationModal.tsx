import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "../i18n";
import type { ProcessRow } from "../types";

interface Props {
  processes: ProcessRow[];
  checking: boolean;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onConfirm: () => void;
}

export function ExitConfirmationModal({ processes, checking, busy, error, onCancel, onRetry, onConfirm }: Props) {
  const { t } = useTranslation();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel]);

  return <div className="modal-backdrop">
    <section className="block-confirmation-modal exit-confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="exit-confirmation-title">
      <div className="block-modal-heading">
        <AlertTriangle size={22} aria-hidden="true" />
        <h2 id="exit-confirmation-title">{checking ? t("exitChecking") : t("exitBlockedTitle")}</h2>
      </div>
      {!checking && <>
        <p className="block-modal-scope">{error ?? t("exitBlockedDescription")}</p>
        {processes.length > 0 && <ul className="exit-process-list">
          {processes.map((process) => <li key={process.path ?? process.key}>
            <strong>{process.name}</strong>
            <code data-tooltip={process.path ?? ""}>{process.path}</code>
          </li>)}
        </ul>}
        {error && <p className="exit-recovery-hint">{t("exitRecoveryHint")}</p>}
      </>}
      <div className="block-modal-actions">
        <button ref={cancelButtonRef} type="button" className="modal-cancel-button" disabled={busy} onClick={onCancel}>{t("exitKeepOpen")}</button>
        {error && <button type="button" className="modal-cancel-button" disabled={busy} onClick={onRetry}>{t("exitRetry")}</button>}
        {!checking && <button type="button" className="modal-confirm-button" disabled={busy} onClick={onConfirm}>{t("exitUnblockAndClose")}</button>}
      </div>
    </section>
  </div>;
}
