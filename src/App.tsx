import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-dialog";
import { AlertTriangle } from "lucide-react";
import { CommandBar } from "./components/CommandBar";
import { DetailsPanel } from "./components/DetailsPanel";
import { ProcessContextMenu } from "./components/ProcessContextMenu";
import { ProcessTable } from "./components/ProcessTable";
import { TitleBar } from "./components/TitleBar";
import { buildProcessTree } from "./lib/processTree";
import type { ProcessNode, ProcessRow } from "./types";

export default function App() {
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showWindows, setShowWindows] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Listo");
  const [contextTarget, setContextTarget] = useState<ProcessNode | null>(null);
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const rows = await invoke<ProcessRow[]>("list_processes", { showWindows });
      setProcesses(rows);
      setSelectedKey((current) => current !== null && rows.some((row) => row.key === current) ? current : null);
      setAdmin(await invoke<boolean>("is_admin"));
      setMessage("Lista actualizada");
    } catch (error) {
      setMessage(String(error));
    } finally { setBusy(false); }
  }, [showWindows]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const webview = getCurrentWebviewWindow();
    let unlisten: (() => void) | undefined;
    void webview.onDragDropEvent(async (event) => {
      if (event.payload.type !== "drop") return;
      const executables = event.payload.paths.filter((path) => path.toLowerCase().endsWith(".exe"));
      if (!executables.length) { setMessage("Arrastra archivos .exe para agregarlos."); return; }
      let addedCount = 0;
      const failures: string[] = [];
      for (const path of executables) {
        try {
          await invoke("add_executable", { path });
          addedCount += 1;
        } catch (error) {
          const fileName = path.split(/[\\/]/).pop() ?? path;
          failures.push(`${fileName}: ${String(error)}`);
        }
      }
      await refresh();
      if (failures.length) {
        const addedMessage = addedCount ? `${addedCount} archivo(s) agregado(s). ` : "";
        setMessage(`${addedMessage}No se pudieron agregar: ${failures.join(" · ")}`);
      } else {
        setMessage(`${addedCount} archivo(s) agregado(s)`);
      }
    }).then((stop) => { unlisten = stop; });
    return () => unlisten?.();
  }, [refresh]);

  const tree = useMemo(() => buildProcessTree(processes, query, filter), [processes, query, filter]);
  const selected = useMemo(() => processes.find((process) => process.key === selectedKey) ?? null, [processes, selectedKey]);
  const blockedCount = useMemo(() => new Set(processes.filter((process) => process.blocked && process.path).map((process) => process.path?.toLowerCase())).size, [processes]);

  const addExecutable = async () => {
    const path = await open({ multiple: false, filters: [{ name: "Aplicaciones", extensions: ["exe"] }] });
    if (typeof path !== "string") return;
    setBusy(true);
    try { await invoke("add_executable", { path }); setMessage("Programa agregado"); await refresh(); }
    catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  };

  const setBlocked = async (blocked: boolean, process: ProcessRow | null = selected) => {
    if (!process?.path) { setMessage("No se pudo obtener la ruta de este proceso."); return; }
    setBusy(true);
    try {
      await invoke<boolean>("set_blocked", { path: process.path, blocked });
      setMessage(blocked ? "Acceso a internet bloqueado" : "Acceso a internet restaurado");
      await refresh();
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  };

  const unblockAll = async () => {
    setBusy(true);
    try { await invoke("unblock_all"); setMessage("Reglas de DropNet eliminadas"); await refresh(); }
    catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  };

  const removeSelected = async () => {
    if (!selected?.path) return;
    setBusy(true);
    try { await invoke("remove_entry", { path: selected.path }); setSelectedKey(null); setMessage("Programa quitado de DropNet"); await refresh(); }
    catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
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
    <TitleBar />
    <section className="client-area">
      {admin === false && <div className="admin-banner"><AlertTriangle size={15} /><span>Ejecuta DropNet como administrador para modificar las reglas del Firewall.</span></div>}
      <CommandBar selected={Boolean(selected?.path)} selectedBlocked={selected?.blocked ?? false} selectedTracked={selected?.tracked ?? false} admin={admin} blockedCount={blockedCount} filter={filter} showWindows={showWindows} busy={busy} onFilterChange={setFilter} onShowWindowsChange={setShowWindows} onBlock={() => void setBlocked(true)} onUnblock={() => void setBlocked(false)} onUnblockAll={() => void unblockAll()} onAdd={() => void addExecutable()} onRemove={() => void removeSelected()} />
      <ProcessTable nodes={tree} selectedKey={selectedKey} onSelect={selectProcess} onOpenContextMenu={openContextMenu} />
      <DetailsPanel selected={selected} blockedCount={blockedCount} processCount={processes.filter((process) => process.running).length} admin={admin} message={message} query={query} busy={busy} onQueryChange={setQuery} onRefresh={() => void refresh()} />
    </section>
    {contextTarget && contextPosition && <ProcessContextMenu process={contextTarget} position={contextPosition} admin={admin} busy={busy} onBlock={() => void setBlocked(true, contextTarget)} onUnblock={() => void setBlocked(false, contextTarget)} onClose={closeContextMenu} />}
  </main>;
}
