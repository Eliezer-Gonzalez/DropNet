import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { ProcessTree } from "./ProcessTree";
import { ColumnHeader } from "./ColumnHeader";
import type { ProcessNode, ProcessSort, SortColumn, SortDirection } from "../types";
import { useTranslation } from "../i18n";
import { sortProcessTree } from "../lib/processSort";

interface Props {
  nodes: ProcessNode[];
  selectedKey: string | null;
  onSelect: (node: ProcessNode) => void;
  onOpenContextMenu: (node: ProcessNode, x: number, y: number) => void;
}

type ResizableColumn = "name" | "path";

const MIN_WIDTHS: Record<ResizableColumn, number> = { name: 140, path: 160 };

export function ProcessTable({ nodes, selectedKey, onSelect, onOpenContextMenu }: Props) {
  const { t } = useTranslation();
  const [widths, setWidths] = useState({ name: 320, path: 440 });
  const [sort, setSort] = useState<ProcessSort>({ column: "name", direction: "ascending" });
  const [openColumn, setOpenColumn] = useState<SortColumn | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ column: ResizableColumn; startX: number; startWidth: number } | null>(null);
  const sortedNodes = useMemo(() => sortProcessTree(nodes, sort), [nodes, sort]);

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
  const toggleSortMenu = (column: SortColumn) => setOpenColumn((current) => current === column ? null : column);
  const chooseSort = (column: SortColumn, direction: SortDirection) => {
    setSort({ column, direction });
    setOpenColumn(null);
  };
  useEffect(() => {
    if (!openColumn) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const headers = headerRef.current?.querySelectorAll("[data-sort-column]");
      const activeHeader = Array.from(headers ?? []).find((header) => header.getAttribute("data-sort-column") === openColumn);
      if (!(event.target instanceof Node) || !activeHeader?.contains(event.target)) setOpenColumn(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [openColumn]);
  const resizeControl = (column: ResizableColumn, label: string) => <button className="column-resizer" aria-label={label} onPointerDown={(event) => startResize(event, column)} onPointerMove={resize} onPointerUp={stopResize} />;

  return <div className="process-table" style={style}>
    <div className="list-heading" ref={headerRef} role="row">
      <ColumnHeader label={t("processColumn")} column="name" activeDirection={sort.column === "name" ? sort.direction : null} options={[{ direction: "ascending", label: t("sortAZ") }, { direction: "descending", label: t("sortZA") }]} open={openColumn === "name"} onToggle={() => toggleSortMenu("name")} onClose={() => setOpenColumn(null)} onSort={(direction) => chooseSort("name", direction)} resizeControl={resizeControl("name", t("resizeProcess"))} />
      <ColumnHeader label="PID" column="pid" activeDirection={sort.column === "pid" ? sort.direction : null} options={[{ direction: "ascending", label: t("sortPidAscending") }, { direction: "descending", label: t("sortPidDescending") }]} open={openColumn === "pid"} onToggle={() => toggleSortMenu("pid")} onClose={() => setOpenColumn(null)} onSort={(direction) => chooseSort("pid", direction)} />
      <div className="column-heading-cell path-heading" data-sort-column="path" role="columnheader"><span>{t("pathColumn")}</span>{resizeControl("path", t("resizePath"))}</div>
      <ColumnHeader label={t("stateColumn")} column="status" activeDirection={sort.column === "status" ? sort.direction : null} options={[{ direction: "ascending", label: t("allowedFirst") }, { direction: "descending", label: t("blockedFirst") }]} open={openColumn === "status"} menuAlign="right" onToggle={() => toggleSortMenu("status")} onClose={() => setOpenColumn(null)} onSort={(direction) => chooseSort("status", direction)} />
    </div>
    <ProcessTree nodes={sortedNodes} selectedKey={selectedKey} onSelect={onSelect} onOpenContextMenu={onOpenContextMenu} />
  </div>;
}
