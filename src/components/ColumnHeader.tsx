import { useEffect, useRef } from "react";
import type { FocusEvent as ReactFocusEvent, ReactNode } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "../i18n";
import type { SortColumn, SortDirection } from "../types";

interface SortOption {
  direction: SortDirection;
  label: string;
}

interface Props {
  label: string;
  column: SortColumn;
  activeDirection: SortDirection | null;
  options: SortOption[];
  open: boolean;
  menuAlign?: "left" | "right";
  resizeControl?: ReactNode;
  onToggle: () => void;
  onClose: () => void;
  onSort: (direction: SortDirection) => void;
}

export function ColumnHeader({ label, column, activeDirection, options, open, menuAlign = "left", resizeControl, onToggle, onClose, onSort }: Props) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const DirectionIcon = activeDirection === "ascending" ? ChevronUp : ChevronDown;
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);
  const closeWhenFocusLeaves = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onClose();
  };
  const selectSort = (direction: SortDirection) => {
    onSort(direction);
    triggerRef.current?.focus();
  };
  return <div className={"column-heading-cell " + (column === "pid" ? "pid-heading" : "") + (column === "status" ? "status-heading" : "")} data-sort-column={column} role="columnheader" aria-sort={activeDirection ?? "none"} onBlur={closeWhenFocusLeaves}>
    <button ref={triggerRef} type="button" className={"sort-trigger " + (activeDirection ? "sort-active" : "")} aria-label={t("sortColumn", { column: label })} aria-controls={column + "-sort-options"} aria-expanded={open} onClick={onToggle}>
      <span>{label}</span><DirectionIcon size={12} aria-hidden="true" />
    </button>
    {open && <div id={column + "-sort-options"} className={"column-sort-menu align-" + menuAlign} role="group" aria-label={t("sortColumn", { column: label })}>
      {options.map(({ direction, label: optionLabel }) => <button type="button" aria-pressed={activeDirection === direction} key={direction} onClick={() => selectSort(direction)}>
        {activeDirection === direction ? <Check size={13} aria-hidden="true" /> : <span className="sort-check-spacer" aria-hidden="true" />}<span>{optionLabel}</span>
      </button>)}
    </div>}
    {resizeControl}
  </div>;
}
