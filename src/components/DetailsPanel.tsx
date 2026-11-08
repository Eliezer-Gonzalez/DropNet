import { FileCode2, RefreshCw, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ProcessRow } from "../types";

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
  return <footer className="details-panel">
    <div className="details-main">
      <FileCode2 size={30} className="details-icon" />
      <div className="details-identity">
        <h2>{selected?.name ?? "Selecciona un proceso"}</h2>
        <div className="details-path" title={selected?.path ?? ""}>{selected?.path ?? "Elige un proceso de la lista para ver su ruta."}</div>
      </div>
      {selected && <div className={`details-status ${selected.blocked ? "blocked" : "allowed"}`}>
        {selected.blocked ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
        <span>{selected.running ? `PID ${selected.pid}` : "No está en ejecución"}<br />{selected.blocked ? "Sin internet" : "Con internet"}</span>
      </div>}
    </div>
    <div className="detail-tools">
      <div className="search-box detail-search-box"><Search size={14} aria-hidden="true" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar procesos" aria-label="Buscar procesos" /></div>
      <button className="command-button detail-refresh-button" disabled={busy} onClick={onRefresh}><RefreshCw size={14} /> Actualizar</button>
    </div>
    <div className="detail-note">Reinicia el programa después de bloquearlo o desbloquearlo para que el cambio se aplique.</div>
    <div className="status-line"><span title={message}>{message}</span><span>{processCount} procesos · {blockedCount} bloqueados</span><span className={admin ? "admin-ok" : "admin-warning"}>{admin ? "Ejecutando como administrador" : "Se requieren permisos de administrador"}</span></div>
  </footer>;
}
