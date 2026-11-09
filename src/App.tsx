import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-dialog";
import { AlertTriangle } from "lucide-react";
import { BlockConfirmationModal } from "./components/BlockConfirmationModal";
import { CommandBar } from "./components/CommandBar";
import { DetailsPanel } from "./components/DetailsPanel";
import { ExitConfirmationModal } from "./components/ExitConfirmationModal";
import { LogsModal } from "./components/LogsModal";
import { StartupRecoveryModal } from "./components/StartupRecoveryModal";
import { ProcessContextMenu } from "./components/ProcessContextMenu";
import { ProcessTable } from "./components/ProcessTable";
import { TitleBar } from "./components/TitleBar";
import { TooltipLayer } from "./components/TooltipLayer";
import { buildProcessTree } from "./lib/processTree";
import { useTranslation } from "./i18n";
import { logFrontendError } from "./lib/logError";
import { finishMinimumLoadingTime } from "./lib/minimumLoadingTime";
import { useSessionLifecycle } from "./hooks/useSessionLifecycle";
import type { ProcessNode, ProcessRow } from "./types";

export default function App() {
  const { t, formatError } = useTranslation();
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showWindows, setShowWindows] = useState(false);
  const showWindowsRef = useRef(showWindows);
  showWindowsRef.current = showWindows;
  const appliedShowWindowsRef = useRef<boolean | null>(null);
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshingProcesses, setRefreshingProcesses] = useState(false);
  const [message, setMessage] = useState(() => t("ready"));
  const [contextTarget, setContextTarget] = useState<ProcessNode | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingBlock, setPendingBlock] = useState<ProcessRow | null>(null);
  const processesRef = useRef<ProcessRow[]>([]);
  const processStateLoadedRef = useRef(false);
  const busyRef = useRef(false);
  const refreshSequenceRef = useRef(0);
  const [skipBlockConfirmation, setSkipBlockConfirmation] = useState(() => {
    try { return localStorage.getItem("dropnet.skipBlockConfirmation") === "true"; }
    catch { return false; }
  });

  const operationBusyRef = useRef(false);
  const activeRefreshCountRef = useRef(0);
  const syncBusyState = useCallback(() => {
    const nextBusy = operationBusyRef.current || activeRefreshCountRef.current > 0;
    busyRef.current = nextBusy;
    setBusy(nextBusy);
  }, []);
  const setBusyState = useCallback((value: boolean) => {
    operationBusyRef.current = value;
    syncBusyState();
  }, [syncBusyState]);

  const refresh = useCallback(async (): Promise<boolean> => {
    const requestId = ++refreshSequenceRef.current;
    const requestedShowWindows = showWindowsRef.current;
    const isCurrentRequest = () => requestId === refreshSequenceRef.current && requestedShowWindows === showWindowsRef.current;
    const startedAt = performance.now();
    activeRefreshCountRef.current += 1;
    setRefreshingProcesses(true);
    syncBusyState();
    try {
      const rows = await invoke<ProcessRow[]>("list_processes", { showWindows: requestedShowWindows });
      if (!isCurrentRequest()) return false;
      const isAdmin = await invoke<boolean>("is_admin");
      if (!isCurrentRequest()) return false;
      processesRef.current = rows;
      processStateLoadedRef.current = true;
      setProcesses(rows);
      setSelectedKey((current) => current !== null && rows.some((row) => row.key === current) ? current : null);
      setAdmin(isAdmin);
      setMessage(t("listUpdated"));
      appliedShowWindowsRef.current = requestedShowWindows;
      return true;
    } catch (error) {
      if (!isCurrentRequest()) return false;
      void logFrontendError("refresh_process_list", error);
      setMessage(formatError(error));
      return false;
    } finally {
      await finishMinimumLoadingTime(startedAt);
      activeRefreshCountRef.current = Math.max(0, activeRefreshCountRef.current - 1);
      setRefreshingProcesses(activeRefreshCountRef.current > 0);
      syncBusyState();
    }
  }, [t, formatError, syncBusyState]);

  const { exitPrompt, startupRecovery, exitUnblockInProgressRef, checkBeforeExit, cancelExit, confirmExit, closeStartupRecovery } = useSessionLifecycle({
    refresh,
    showWindows,
    appliedShowWindowsRef,
    busyRef,
    setBusyState,
    setMessage,
  });

  useEffect(() => {
    const onError = (event: ErrorEvent) => { void logFrontendError("uncaught_frontend_error", event.error ?? event.message); };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => { void logFrontendError("unhandled_promise_rejection", event.reason); };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const webview = getCurrentWebviewWindow();
    let unlisten: (() => void) | undefined;
    void webview.onDragDropEvent(async (event) => {
      if (event.payload.type !== "drop" || exitUnblockInProgressRef.current || busyRef.current) return;
      const executables = event.payload.paths.filter((path) => path.toLowerCase().endsWith(".exe"));
      if (!executables.length) { setMessage(t("dragExe")); return; }
      let addedCount = 0;
      const failures: string[] = [];
      for (const path of executables) {
        try {
          await invoke("add_executable", { path });
          addedCount += 1;
        } catch (error) {
          void logFrontendError("add_dropped_executable", error);
          const fileName = path.split(/[\\/]/).pop() ?? path;
          failures.push(`${fileName}: ${formatError(error)}`);
        }
      }
      await refresh();
      if (failures.length) {
        setMessage(addedCount
          ? t("addedFilesWithErrors", { addedSummary: t(addedCount === 1 ? "addedOne" : "addedMany", { count: addedCount }), errors: failures.join(" · ") })
          : t("couldNotAddFiles", { errors: failures.join(" · ") }));
      } else {
        setMessage(t(addedCount === 1 ? "addedOne" : "addedMany", { count: addedCount }));
      }
    }).then((stop) => { unlisten = stop; });
    return () => unlisten?.();
  }, [refresh, t, formatError]);

  const tree = useMemo(() => buildProcessTree(processes, query, filter), [processes, query, filter]);
  const selected = useMemo(() => processes.find((process) => process.key === selectedKey) ?? null, [processes, selectedKey]);
  const blockedCount = useMemo(() => new Set(processes.filter((process) => process.blocked && process.path).map((process) => process.path?.toLowerCase())).size, [processes]);

  const addExecutable = async () => {
    setBusyState(true);
    let path: string | null;
    try {
      path = await open({ multiple: false, filters: [{ name: t("applications"), extensions: ["exe"] }] });
    } catch (error) {
      void logFrontendError("open_executable_picker", error);
      setMessage(formatError(error));
      setBusyState(false);
      return;
    }
    if (typeof path !== "string") { setBusyState(false); return; }
    try { await invoke("add_executable", { path }); setMessage(t("programAdded")); await refresh(); }
    catch (error) { void logFrontendError("add_executable", error); setMessage(formatError(error)); }
    finally { setBusyState(false); }
  };

  const setBlocked = async (blocked: boolean, process: ProcessRow | null = selected) => {
    if (!process?.path) { setMessage(t("pathError")); return; }
    setBusyState(true);
    try {
      const actualBlocked = await invoke<boolean>("set_blocked", { path: process.path, blocked });
      const normalizedPath = process.path.toLowerCase();
      processesRef.current = processesRef.current.map((row) => row.path?.toLowerCase() === normalizedPath
        ? { ...row, blocked: actualBlocked, tracked: true }
        : row);
      setProcesses(processesRef.current);
      const refreshed = await refresh();
      if (refreshed) {
        setMessage(actualBlocked === blocked
          ? (blocked ? t("internetBlocked") : t("internetRestored"))
          : t("firewallUnconfirmed"));
      }
    } catch (error) { void logFrontendError("set_process_network_access", error); await refresh(); setMessage(formatError(error)); }
    finally { setBusyState(false); }
  };

  const requestBlock = (process: ProcessRow | null = selected) => {
    if (!process?.path) { setMessage(t("pathError")); return; }
    if (skipBlockConfirmation) { void setBlocked(true, process); return; }
    setPendingBlock(process);
  };

  const confirmBlock = (doNotAskAgain: boolean) => {
    if (!pendingBlock) return;
    if (doNotAskAgain) {
      try {
        localStorage.setItem("dropnet.skipBlockConfirmation", "true");
        setSkipBlockConfirmation(true);
      } catch (error) {
        void logFrontendError("save_block_confirmation_preference", error);
      }
    }
    const process = pendingBlock;
    setPendingBlock(null);
    void setBlocked(true, process);
  };

  const restoreBlockConfirmation = () => {
    try {
      localStorage.removeItem("dropnet.skipBlockConfirmation");
      setSkipBlockConfirmation(false);
    } catch (error) {
      void logFrontendError("restore_block_confirmation_preference", error);
    }
  };

  const unblockAll = async () => {
    setBusyState(true);
    try { await invoke("unblock_all"); setMessage(t("rulesRemoved")); await refresh(); }
    catch (error) { void logFrontendError("unblock_all", error); setMessage(formatError(error)); }
    finally { setBusyState(false); }
  };

  const removeSelected = async () => {
    if (!selected?.path) return;
    setBusyState(true);
    try { await invoke("remove_entry", { path: selected.path }); setSelectedKey(null); setMessage(t("programRemoved")); await refresh(); }
    catch (error) { void logFrontendError("remove_entry", error); setMessage(formatError(error)); }
    finally { setBusyState(false); }
  };

  const selectProcess = (process: ProcessNode) => setSelectedKey(process.key);
  const openContextMenu = (process: ProcessNode, x: number, y: number) => {
    setSelectedKey(process.key);
    setContextTarget(process);
    setContextPosition({ x, y });
  };
  const closeContextMenu = useCallback(() => { setContextTarget(null); setContextPosition(null); }, []);

  return <main className="app-window" onContextMenu={(event) => event.preventDefault()}>
    <div className="glass-shine" aria-hidden="true" />
      <TitleBar blockConfirmationDisabled={skipBlockConfirmation} onEnableBlockConfirmation={restoreBlockConfirmation} />
    <section className="client-area">
      {admin === false && <div className="admin-banner"><AlertTriangle size={15} /><span>{t("adminWarning")}</span></div>}
      <CommandBar selected={Boolean(selected?.path)} selectedBlocked={selected?.blocked ?? false} selectedTracked={selected?.tracked ?? false} admin={admin} blockedCount={blockedCount} filter={filter} showWindows={showWindows} busy={busy} onFilterChange={setFilter} onShowWindowsChange={setShowWindows} onBlock={() => requestBlock()} onUnblock={() => void setBlocked(false)} onUnblockAll={() => void unblockAll()} onAdd={() => void addExecutable()} onRemove={() => void removeSelected()} />
      <ProcessTable nodes={tree} selectedKey={selectedKey} onSelect={selectProcess} onOpenContextMenu={openContextMenu} />
      <DetailsPanel selected={selected} blockedCount={blockedCount} processCount={processes.filter((process) => process.running).length} admin={admin} message={message} query={query} busy={busy} refreshing={refreshingProcesses} onQueryChange={setQuery} onRefresh={() => void refresh()} onShowLogs={() => setLogsOpen(true)} />
    </section>
    {contextTarget && contextPosition && <ProcessContextMenu process={contextTarget} position={contextPosition} admin={admin} busy={busy} onBlock={() => requestBlock(contextTarget)} onUnblock={() => void setBlocked(false, contextTarget)} onClose={closeContextMenu} />}
    {pendingBlock && <BlockConfirmationModal process={pendingBlock} onCancel={() => setPendingBlock(null)} onConfirm={confirmBlock} />}
    {exitPrompt && <ExitConfirmationModal processes={exitPrompt.processes} checking={exitPrompt.checking} busy={exitPrompt.busy} error={exitPrompt.error} onCancel={cancelExit} onRetry={() => void checkBeforeExit()} onConfirm={() => void confirmExit()} />}
    {startupRecovery && <StartupRecoveryModal report={startupRecovery} onClose={closeStartupRecovery} />}
    {logsOpen && <LogsModal onClose={() => setLogsOpen(false)} />}
    <TooltipLayer />
  </main>;
}
