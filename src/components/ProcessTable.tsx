import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { ProcessTree } from "./ProcessTree";
import type { ProcessNode } from "../types";

interface Props {
  nodes: ProcessNode[];
  selectedKey: string | null;
  onSelect: (node: ProcessNode) => void;
  onOpenContextMenu: (node: ProcessNode, x: number, y: number) => void;
}

type ResizableColumn = "name" | "path";

const MIN_WIDTHS: Record<ResizableColumn, number> = { name: 140, path: 160 };

export function ProcessTable({ nodes, selectedKey, onSelect, onOpenContextMenu }: Props) {
  const [widths, setWidths] = useState({ name: 320, path: 440 });
  const dragRef = useRef<{ column: ResizableColumn; startX: number; startWidth: number } | null>(null);

  const startResize = (event: ReactPointerEvent, column: ResizableColumn) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { column, startX: event.clientX, startWidth: widths[column] };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const resize = (event: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const width = Math.max(MIN_WIDTHS[drag.column], drag.startWidth + event.clientX - drag.startX);
    setWidths((current) => ({ ...current, [drag.column]: width }));
  };

  const stopResize = () => { dragRef.current = null; };
  const style = {
    "--name-column-width": `${widths.name}px`,
    "--path-column-width": `${widths.path}px`,
  } as CSSProperties;

  return <div className="process-table" style={style}>
    <div className="list-heading">
      <span>Proceso<button className="column-resizer" aria-label="Cambiar ancho de Proceso" onPointerDown={(event) => startResize(event, "name")} onPointerMove={resize} onPointerUp={stopResize} /></span>
      <span>PID</span>
      <span>Ubicación del ejecutable<button className="column-resizer" aria-label="Cambiar ancho de Ubicación del ejecutable" onPointerDown={(event) => startResize(event, "path")} onPointerMove={resize} onPointerUp={stopResize} /></span>
      <span>Estado</span>
    </div>
    <ProcessTree nodes={nodes} selectedKey={selectedKey} onSelect={onSelect} onOpenContextMenu={onOpenContextMenu} />
  </div>;
}
