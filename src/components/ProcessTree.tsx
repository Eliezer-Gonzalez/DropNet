import { useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { ChevronDown, ChevronRight, CircleAlert, FileCode2, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ProcessNode } from "../types";

interface Props { nodes: ProcessNode[]; selectedKey: string | null; onSelect: (node: ProcessNode) => void; onOpenContextMenu: (node: ProcessNode, x: number, y: number) => void; }

export function ProcessTree({ nodes, selectedKey, onSelect, onOpenContextMenu }: Props) {
  if (!nodes.length) return <div className="empty-state"><FileCode2 size={28} /><strong>No hay procesos que coincidan con el filtro.</strong><span>Prueba otra búsqueda o actualiza la lista.</span></div>;
  return <div className="process-list" role="tree" aria-label="Procesos en ejecución">
    {nodes.map((node) => <ProcessTreeRow key={node.key} node={node} depth={0} selectedKey={selectedKey} onSelect={onSelect} onOpenContextMenu={onOpenContextMenu} />)}
  </div>;
}

function ProcessTreeRow({ node, depth, selectedKey, onSelect, onOpenContextMenu }: { node: ProcessNode; depth: number; selectedKey: string | null; onSelect: (node: ProcessNode) => void; onOpenContextMenu: (node: ProcessNode, x: number, y: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const selected = selectedKey === node.key;
  const openKeyboardMenu = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    onOpenContextMenu(node, bounds.left + 24, bounds.bottom);
  };
  return <>
    <button className={`process-row${selected ? " selected" : ""}`} style={{ "--depth": depth } as CSSProperties} role="treeitem" aria-selected={selected} aria-expanded={node.children.length ? expanded : undefined} onClick={() => onSelect(node)} onDoubleClick={() => node.children.length && setExpanded((value) => !value)} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onOpenContextMenu(node, event.clientX, event.clientY); }} onKeyDown={openKeyboardMenu}>
      <span className="process-name" style={{ paddingLeft: 8 + depth * 17 }}>
        {node.children.length ? <span className="tree-toggle" aria-label={expanded ? "Contraer" : "Expandir"} onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span> : <span className="tree-spacer" />}
        {node.iconData
          ? <img className="process-icon-image" src={`data:image/png;base64,${node.iconData}`} alt="" />
          : <FileCode2 size={15} className="process-icon" />}
        <span className="process-name-text" title={node.path ?? "Ruta no disponible"}>{node.name}</span>
      </span>
      <span className="pid-cell">{node.running ? node.pid : "—"}</span>
      <span className="path-cell" title={node.path ?? "Ruta no disponible"}>{node.path ?? "Ruta no disponible"}</span>
      <span className={`state-cell ${node.blocked ? "blocked" : "allowed"}`}>
        {node.blocked ? <><ShieldAlert size={14} /> Bloqueado</> : <><ShieldCheck size={14} /> Permitido</>}
        {!node.fileExists && <span className="missing-icon" title="El archivo ya no existe"><CircleAlert size={14} /></span>}
      </span>
    </button>
    {expanded && node.children.map((child) => <ProcessTreeRow key={child.key} node={child} depth={depth + 1} selectedKey={selectedKey} onSelect={onSelect} onOpenContextMenu={onOpenContextMenu} />)}
  </>;
}
