import { useEffect, useRef } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import type { ProcessNode } from "../types";
import { useTranslation } from "../i18n";

interface Props {
  process: ProcessNode;
  position: { x: number; y: number };
  admin: boolean;
  busy: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onClose: () => void;
}

export function ProcessContextMenu({ process, position, admin, busy, onBlock, onUnblock, onClose }: Props) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const blocked = process.blocked;
  const disabled = !process.path || !admin || busy;
  const left = Math.min(position.x, window.innerWidth - 210);
  const top = Math.min(position.y, window.innerHeight - 54);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    menuRef.current?.focus();
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return <div ref={menuRef} className="process-context-menu" role="menu" tabIndex={-1} style={{ left: Math.max(8, left), top: Math.max(8, top) }} aria-label={t("contextActions", { name: process.name })}>
    <button type="button" role="menuitem" disabled={disabled} onClick={() => { (blocked ? onUnblock : onBlock)(); onClose(); }}>
      {blocked ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
      {blocked ? t("restoreInternetContext") : t("blockInternetContext")}
    </button>
  </div>;
}
