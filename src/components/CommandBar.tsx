import { ShieldOff, ShieldCheck, ShieldX, Plus, Eye, Trash2 } from "lucide-react";

interface Props {
  selected: boolean;
  selectedBlocked: boolean;
  selectedTracked: boolean;
  admin: boolean;
  blockedCount: number;
  filter: string;
  showWindows: boolean;
  busy: boolean;
  onFilterChange: (value: string) => void;
  onShowWindowsChange: (value: boolean) => void;
  onBlock: () => void;
  onUnblock: () => void;
  onUnblockAll: () => void;
  onAdd: () => void;
  onRemove: () => void;
}

export function CommandBar(props: Props) {
  return <div className="command-bar">
    <button className="command-button" disabled={!props.selected || props.selectedBlocked || props.busy || !props.admin} onClick={props.onBlock}><ShieldOff size={14} /> Cortar internet</button>
    <button className="command-button" disabled={!props.selected || !props.selectedBlocked || props.busy || !props.admin} onClick={props.onUnblock}><ShieldCheck size={14} /> Restaurar</button>
    <button className="command-button" disabled={props.blockedCount === 0 || props.busy || !props.admin} onClick={props.onUnblockAll}><ShieldX size={14} /> Restaurar todo</button>
    <button className="command-button" disabled={!props.selectedTracked || props.busy || !props.admin} onClick={props.onRemove}><Trash2 size={14} /> Quitar</button>
    <button className="command-button add-button" disabled={props.busy} onClick={props.onAdd}><Plus size={14} /> Agregar .exe</button>
    <span className="command-spacer" />
    <label className="filter-label" htmlFor="process-filter">Mostrar:</label>
    <select id="process-filter" value={props.filter} onChange={(event) => props.onFilterChange(event.target.value)}>
      <option value="all">Todos</option><option value="online">Con internet</option><option value="blocked">Bloqueados</option>
    </select>
    <label className="show-windows"><input type="checkbox" checked={props.showWindows} onChange={(event) => props.onShowWindowsChange(event.target.checked)} /><Eye size={13} /> Windows</label>
  </div>;
}
