import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileText, RefreshCw, Search, X } from "lucide-react";
import { useTranslation } from "../i18n";
import { logFrontendError } from "../lib/logError";
import { finishMinimumLoadingTime } from "../lib/minimumLoadingTime";

interface LogSnapshot {
  logPath: string;
  content: string;
}

type LogLevel = "all" | "ERROR" | "WARN" | "INFO";

interface Props {
  onClose: () => void;
}

export function LogsModal({ onClose }: Props) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<LogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<LogLevel>("all");

  const refresh = async () => {
    const startedAt = performance.now();
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await invoke<LogSnapshot>("read_logs"));
    } catch (reason) {
      void logFrontendError("read_application_logs", reason);
      setError(t("logsLoadError"));
    } finally {
      await finishMinimumLoadingTime(startedAt);
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const lines = useMemo(() => (snapshot?.content ?? "").split(/\r?\n/).filter((line) => {
    if (level !== "all" && !line.includes("[" + level + "]")) return false;
    return line.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }), [snapshot, level, query]);

  return <div className="modal-backdrop logs-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="logs-modal" role="dialog" aria-modal="true" aria-labelledby="logs-title">
      <header className="logs-heading">
        <div className="block-modal-heading"><FileText size={20} /><h2 id="logs-title">{t("logsTitle")}</h2></div>
        <button type="button" className="icon-button" aria-label={t("close")} onClick={onClose}><X size={16} /></button>
      </header>
      <p className="logs-description">{t("logsDescription")}</p>
      <div className="logs-location"><strong>{t("logFileLocation")}:</strong> <code title={snapshot?.logPath}>{snapshot?.logPath ?? "—"}</code></div>
      <div className="logs-tools">
        <label className="search-box logs-search"><Search size={14} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchLogs")} aria-label={t("searchLogs")} /></label>
        <label className="logs-level"><span>{t("severity")}:</span><select value={level} onChange={(event) => setLevel(event.target.value as LogLevel)}>
          <option value="all">{t("allLevels")}</option><option value="ERROR">{t("errorLevel")}</option><option value="WARN">{t("warningLevel")}</option><option value="INFO">{t("infoLevel")}</option>
        </select></label>
        <button type="button" className="command-button detail-refresh-button" aria-busy={loading} disabled={loading} onClick={() => void refresh()}><RefreshCw size={14} className={loading ? "refresh-spinning" : undefined} /> {loading ? t("refreshingLogs") : t("refreshLogs")}</button>
      </div>
      {error && <div className="logs-error" role="alert">{error}</div>}
      {!snapshot && loading ? <div className="logs-message">{t("logsLoading")}</div> : snapshot && (lines.length ? <pre className="logs-content">{lines.map((line, index) => <span className={"log-line " + (line.includes("[ERROR]") ? "log-error" : line.includes("[WARN]") ? "log-warn" : "")} key={index + "-" + line}>{line}{"\n"}</span>)}</pre> : <div className="logs-message">{t("noLogs")}</div>)}
      <footer className="logs-footer"><span>{t("logEntries", { count: lines.length })}</span><button type="button" className="command-button" onClick={onClose}>{t("close")}</button></footer>
    </section>
  </div>;
}
