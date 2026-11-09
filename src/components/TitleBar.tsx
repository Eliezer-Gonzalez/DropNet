import { useEffect, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { BellOff, Copy, Minus, Square, X, WifiOff } from "lucide-react";
import { useTranslation } from "../i18n";
import type { Language } from "../i18n";
import { logFrontendError } from "../lib/logError";

interface Props {
  blockConfirmationDisabled: boolean;
  onEnableBlockConfirmation: () => void;
}

export function TitleBar({ blockConfirmationDisabled, onEnableBlockConfirmation }: Props) {
  const { language, setLanguage, t } = useTranslation();
  const [window] = useState(() => getCurrentWindow());
  const [isMaximized, setIsMaximized] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    void getVersion().then((version) => {
      if (!disposed) setAppVersion(version);
    }).catch((error) => {
      void logFrontendError("load_app_version", error);
    });
    return () => { disposed = true; };
  }, []);

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

  const startWindowDrag = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest(".window-controls, button, a, input, select, textarea")) return;
    void window.startDragging().catch((error) => { void logFrontendError("move_window", error); });
  };

  return <header className="titlebar" onMouseDown={startWindowDrag}>
    <div className="title">
      <WifiOff size={17} strokeWidth={2.2} aria-hidden="true" />
      <span>DropNet</span>
      {appVersion && <span className="title-version">v{appVersion}</span>}
    </div>
    <label className="language-picker">
      <span>{t("language")}:</span>
      <select aria-label={t("language")} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </label>
    {blockConfirmationDisabled && <button type="button" className="confirmation-setting-button" data-tooltip={t("restoreBlockConfirmation")} aria-label={t("restoreBlockConfirmation")} onClick={onEnableBlockConfirmation}><BellOff size={14} /> {t("confirmationsOff")}</button>}
    <nav className="window-controls" aria-label={t("windowControls")}>
      <button type="button" className="window-button" aria-label={t("minimize")} onClick={() => void window.minimize()}><Minus size={13} /></button>
      <button type="button" className="window-button" aria-label={isMaximized ? t("restore") : t("maximize")} data-tooltip={isMaximized ? t("restore") : t("maximize")} onClick={() => void toggleMaximize()}>{isMaximized ? <Copy size={11} /> : <Square size={11} />}</button>
      <button type="button" className="window-button close-button" aria-label={t("close")} onClick={() => void window.close()}><X size={14} /></button>
    </nav>
  </header>;
}
