import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipState {
  text: string;
  left: number;
  top: number;
}

export function TooltipLayer() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const activeTarget = useRef<HTMLElement | null>(null);
  const tooltipElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const target = activeTarget.current;
      const text = target?.dataset.tooltip;
      if (!target || !text || !target.isConnected) {
        activeTarget.current = null;
        setTooltip(null);
        return;
      }
      const bounds = target.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) {
        setTooltip(null);
        return;
      }
      setTooltip({ text, left: Math.max(8, bounds.left), top: bounds.bottom + 7 });
    };
    const findTarget = (target: EventTarget | null) => target instanceof Element
      ? target.closest<HTMLElement>("[data-tooltip]")
      : null;
    const handlePointerOver = (event: PointerEvent) => {
      const target = findTarget(event.target);
      if (!target) return;
      activeTarget.current = target;
      updatePosition();
    };
    const handlePointerOut = (event: PointerEvent) => {
      const target = findTarget(event.target);
      if (!target || target !== activeTarget.current) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      activeTarget.current = null;
      setTooltip(null);
    };
    const handleFocusIn = (event: FocusEvent) => {
      const target = findTarget(event.target);
      if (!target) return;
      activeTarget.current = target;
      updatePosition();
    };
    const handleFocusOut = (event: FocusEvent) => {
      const target = findTarget(event.target);
      if (!target || target !== activeTarget.current) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      activeTarget.current = null;
      setTooltip(null);
    };

    document.addEventListener("pointerover", handlePointerOver);
    document.addEventListener("pointerout", handlePointerOut);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerout", handlePointerOut);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  useLayoutEffect(() => {
    if (!tooltip) return;
    const target = activeTarget.current;
    const element = tooltipElement.current;
    if (!target || !element) return;

    const anchor = target.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - bounds.width - 8));
    const below = anchor.bottom + 7;
    const top = Math.max(8, below + bounds.height <= window.innerHeight - 8
      ? below
      : anchor.top - bounds.height - 7);
    if (left !== tooltip.left || top !== tooltip.top) {
      setTooltip({ ...tooltip, left, top });
    }
  }, [tooltip]);

  if (!tooltip) return null;
  return createPortal(
    <div ref={tooltipElement} className="app-tooltip" role="tooltip" style={{ left: tooltip.left, top: tooltip.top }}>
      {tooltip.text}
    </div>,
    document.body,
  );
}
