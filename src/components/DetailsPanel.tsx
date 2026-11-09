import { FileCode2, RefreshCw, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ProcessRow } from "../types";
import { useTranslation } from "../i18n";

interface Props {
  selected: ProcessRow | null;
  blockedCount: number;
  processCount: number;
  admin: boolean;
  message: string;
  query: string;
  busy: boolean;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
}

export function DetailsPanel({ selected, blockedCount, processCount, admin, message, query, busy, onQueryChange, onRefresh }: Props) {
  const { t } = useTranslation();
  return <footer className="details-panel">
    <div className="details-main">
      <FileCode2 size={30} className="details-icon" />
      <div className="details-identity">
        <h2>{selected?.name ?? t("selectProcess")}</h2>
        <div className="details-path" data-tooltip={selected?.path ?? ""}>{selected?.path ?? t("chooseProcessPath")}</div>
      </div>
      {selected && <div className={`details-status ${selected.blocked ? "blocked" : "allowed"}`}>
        {selected.blocked ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
        <span>{selected.running ? `PID ${selected.pid}` : t("notRunning")}<br />{selected.blocked ? t("noInternet") : t("withInternet")}</span>
      </div>}
    </div>
    <div className="detail-tools">
      <div className="search-box detail-search-box"><Search size={14} aria-hidden="true" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t("searchProcesses")} aria-label={t("searchProcesses")} /></div>
      <button className="command-button detail-refresh-button" disabled={busy} onClick={onRefresh}><RefreshCw size={14} /> {t("refresh")}</button>
    </div>
    <div className="detail-note">{t("restartHint")}</div>
    <div className="detail-recovery-note">{t("recoveryHint")}</div>
    <div className="status-line"><span data-tooltip={message}>{message}</span><span>{t("processCount", { processCount, processLabel: t(processCount === 1 ? "processSingular" : "processPlural"), blockedCount })}</span><span className={admin ? "admin-ok" : "admin-warning"}>{admin ? t("runningAsAdmin") : t("adminRequired")}</span></div>
  </footer>;
}
