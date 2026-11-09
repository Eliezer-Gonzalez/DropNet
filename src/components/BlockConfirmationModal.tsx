import { useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "../i18n";
import type { ProcessRow } from "../types";

interface Props {
  process: ProcessRow;
  onCancel: () => void;
  onConfirm: (doNotAskAgain: boolean) => void;
}

export function BlockConfirmationModal({ process, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();
  const [doNotAskAgain, setDoNotAskAgain] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="block-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="block-confirmation-title">
      <div className="block-modal-heading">
        <ShieldAlert size={22} aria-hidden="true" />
        <h2 id="block-confirmation-title">{t("confirmBlockTitle", { name: process.name })}</h2>
      </div>
      <p className="block-modal-scope">{t("confirmBlockScope")}</p>
      <div className="block-modal-path">
        <span>{t("confirmBlockPath")}</span>
        <code data-tooltip={process.path ?? ""}>{process.path}</code>
      </div>
      <label className="block-modal-checkbox">
        <input type="checkbox" checked={doNotAskAgain} onChange={(event) => setDoNotAskAgain(event.target.checked)} />
        <span>{t("doNotAskAgain")}</span>
      </label>
      <div className="block-modal-actions">
        <button ref={cancelButtonRef} type="button" className="modal-cancel-button" onClick={onCancel}>{t("cancel")}</button>
        <button type="button" className="modal-confirm-button" onClick={() => onConfirm(doNotAskAgain)}>{t("confirmBlock")}</button>
      </div>
    </section>
  </div>;
}
