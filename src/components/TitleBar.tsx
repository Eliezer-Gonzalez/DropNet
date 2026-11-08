import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X, WifiOff } from "lucide-react";

export function TitleBar() {
  const [window] = useState(() => getCurrentWindow());
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void window.isMaximized().then((maximized) => {
      if (!disposed) setIsMaximized(maximized);
    });
    void window.onResized(() => {
      void window.isMaximized().then((maximized) => {
        if (!disposed) setIsMaximized(maximized);
      });
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [window]);

  const toggleMaximize = async () => {
    await window.toggleMaximize();
    setIsMaximized(await window.isMaximized());
  };

  return <header className="titlebar" data-tauri-drag-region="deep">
    <div className="title" data-tauri-drag-region>
      <WifiOff size={17} strokeWidth={2.2} aria-hidden="true" />
      <span>DropNet</span>
    </div>
    <nav className="window-controls" data-tauri-drag-region="false" aria-label="Controles de ventana">
      <button type="button" className="window-button" aria-label="Minimizar" onClick={() => void window.minimize()}><Minus size={13} /></button>
      <button type="button" className="window-button" aria-label={isMaximized ? "Restaurar" : "Maximizar"} title={isMaximized ? "Restaurar" : "Maximizar"} onClick={() => void toggleMaximize()}>{isMaximized ? <Copy size={11} /> : <Square size={11} />}</button>
      <button type="button" className="window-button close-button" aria-label="Cerrar" onClick={() => void window.close()}><X size={14} /></button>
    </nav>
  </header>;
}
