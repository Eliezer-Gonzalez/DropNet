import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "../i18n";
import { logFrontendError } from "../lib/logError";
import type { ProcessRow, StartupRecoveryReport } from "../types";

interface ExitPromptState {
  processes: ProcessRow[];
  checking: boolean;
  busy: boolean;
  error: string | null;
}

interface Options {
  refresh: () => Promise<boolean>;
  showWindows: boolean;
  busyRef: React.MutableRefObject<boolean>;
  setBusyState: (value: boolean) => void;
  setMessage: (message: string) => void;
}

export function useSessionLifecycle({ refresh, showWindows, busyRef, setBusyState, setMessage }: Options) {
  const { t, formatError } = useTranslation();
  const [exitPrompt, setExitPrompt] = useState<ExitPromptState | null>(null);
  const [startupRecovery, setStartupRecovery] = useState<StartupRecoveryReport | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const sessionInitializationRef = useRef<Promise<void> | null>(null);
  const initializedShowWindowsRef = useRef(showWindows);
  const exitUnblockInProgressRef = useRef(false);
  const allowCloseRef = useRef(false);
  const exitGenerationRef = useRef(0);

  const checkBeforeExit = useCallback(async () => {
    const generation = ++exitGenerationRef.current;
    exitUnblockInProgressRef.current = true;
    setExitPrompt({ processes: [], checking: true, busy: false, error: null });
    try {
      if (busyRef.current) {
        exitUnblockInProgressRef.current = false;
        setExitPrompt({ processes: [], checking: false, busy: false, error: t("waitForAction") });
        return;
      }
      const paths = await invoke<string[]>("list_blocked_paths");
      if (generation !== exitGenerationRef.current) return;
      const blockedProcesses: ProcessRow[] = paths.map((path) => ({
        key: path, path, name: path.split(/[\\/]/).pop() ?? path, pid: 0, parentPid: null,
        iconData: null, blocked: true, fileExists: true, tracked: true, running: false,
      }));
      if (!blockedProcesses.length) {
        await invoke("unblock_all");
        if (generation !== exitGenerationRef.current) return;
        setExitPrompt(null);
        allowCloseRef.current = true;
        await getCurrentWindow().close();
        return;
      }
      setExitPrompt({ processes: blockedProcesses, checking: false, busy: false, error: null });
    } catch (error) {
      if (generation !== exitGenerationRef.current) return;
      exitUnblockInProgressRef.current = false;
      allowCloseRef.current = false;
      void logFrontendError("check_blocked_programs_before_exit", error);
      setExitPrompt({ processes: [], checking: false, busy: false, error: formatError(error) });
    }
  }, [busyRef, formatError, t]);

  useEffect(() => {
    if (sessionInitializationRef.current) return;
    setBusyState(true);
    sessionInitializationRef.current = (async () => {
      let recoveryError: string | null = null;
      let recoveryReport: StartupRecoveryReport | null = null;
      try { recoveryReport = await invoke<StartupRecoveryReport>("initialize_session"); }
      catch (error) { void logFrontendError("recover_stale_firewall_rules", error); recoveryError = formatError(error); }
      await refresh();
      initializedShowWindowsRef.current = showWindows;
      if (recoveryReport && (recoveryReport.stalePaths.length || recoveryReport.failures.length)) setStartupRecovery(recoveryReport);
      if (recoveryReport?.failures.length) recoveryError = t("startupRecoveryFailure", { detail: recoveryReport.failures.map(({ path, detail }) => `${path}: ${formatError(detail)}`).join("; ") });
      if (recoveryError) setMessage(recoveryError);
      setSessionReady(true);
    })();
  }, [formatError, refresh, setBusyState, setMessage, showWindows, t]);

  useEffect(() => {
    if (!sessionReady || initializedShowWindowsRef.current === showWindows) return;
    initializedShowWindowsRef.current = showWindows;
    void refresh();
  }, [sessionReady, showWindows, refresh]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void appWindow.onCloseRequested(async (event) => {
      if (allowCloseRef.current) { allowCloseRef.current = false; return; }
      event.preventDefault();
      if (!exitUnblockInProgressRef.current) await checkBeforeExit();
    }).then((stop) => { if (disposed) stop(); else unlisten = stop; });
    return () => { disposed = true; unlisten?.(); };
  }, [checkBeforeExit]);

  const cancelExit = () => {
    exitGenerationRef.current += 1;
    exitUnblockInProgressRef.current = false;
    setExitPrompt(null);
  };

  const confirmExit = async () => {
    if (!exitPrompt || exitPrompt.busy) return;
    if (busyRef.current) { setExitPrompt((current) => current ? { ...current, busy: false, error: t("waitForAction") } : current); return; }
    exitUnblockInProgressRef.current = true;
    setExitPrompt((current) => current ? { ...current, busy: true, error: null } : current);
    try {
      await invoke("unblock_all"); allowCloseRef.current = true; await getCurrentWindow().close(); setExitPrompt(null);
    } catch (error) {
      exitUnblockInProgressRef.current = false; allowCloseRef.current = false;
      void logFrontendError("unblock_all_before_exit", error);
      setExitPrompt((current) => current ? { ...current, busy: false, error: formatError(error) } : current);
    }
  };

  const closeStartupRecovery = () => setStartupRecovery(null);
  return { exitPrompt, startupRecovery, sessionReady, exitUnblockInProgressRef, checkBeforeExit, cancelExit, confirmExit, closeStartupRecovery };
}
