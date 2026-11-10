import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { logTranslations } from "./locales/logs";
import { tableTranslations } from "./locales/table";

const translations = {
  en: {
    ...logTranslations.en,
    ...tableTranslations.en,
    language: "Language",
    restoreBlockConfirmation: "Turn on block confirmations",
    confirmationsOff: "Confirmations off",
    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
    close: "Close",
    windowControls: "Window controls",
    cutInternet: "Block internet",
    restoreInternet: "Restore access",
    restoreAll: "Restore all",
    remove: "Remove",
    addExe: "Add .exe",
    applications: "Applications",
    show: "Show:",
    all: "All",
    online: "Allowed",
    blocked: "Blocked",
    windows: "Windows",
    processColumn: "Process",
    pathColumn: "Executable location",
    stateColumn: "Status",
    resizeProcess: "Resize Process column",
    resizePath: "Resize Executable location column",
    runningProcesses: "Running processes",
    collapse: "Collapse",
    expand: "Expand",
    blockedStatus: "Blocked",
    allowedStatus: "Allowed",
    fileMissing: "File no longer exists",
    pathUnavailable: "Path unavailable",
    noMatchingProcesses: "No processes match the current filter.",
    trySearchOrRefresh: "Try another search or refresh the list.",
    selectProcess: "Select a process",
    chooseProcessPath: "Choose a process from the list to view its path.",
    notRunning: "Not running",
    noInternet: "No internet",
    withInternet: "With internet",
    searchProcesses: "Search processes",
    refresh: "Refresh",
    restartHint: "Restart the program after blocking or restoring access for the change to take effect.",
    recoveryHint: "If DropNet closes unexpectedly or power is lost, Windows may keep these blocks active. DropNet will try to restore access the next time it starts.",
    waitForAction: "Wait for the current operation to finish, then check again.",
    firewallStateUnavailable: "DropNet could not verify the current Firewall state. You can retry or remove all DropNet rules before exiting.",
    listUpdated: "List updated",
    processCount: "{processCount} {processLabel} · {blockedCount} blocked",
    processSingular: "process",
    processPlural: "processes",
    runningAsAdmin: "Running as administrator",
    adminRequired: "Administrator permission required",
    adminWarning: "Run DropNet as administrator to change Firewall rules.",
    ready: "Ready",
    dragExe: "Drop .exe files to add them.",
    addedOne: "Added 1 file",
    addedMany: "Added {count} files",
    addedFilesWithErrors: "{addedSummary}. Could not add: {errors}",
    couldNotAddFiles: "Could not add: {errors}",
    programAdded: "Program added",
    internetBlocked: "Internet access blocked",
    internetRestored: "Internet access restored",
    firewallUnconfirmed: "Windows Firewall did not confirm the requested change.",
    rulesRemoved: "DropNet rules removed",
    programRemoved: "Program removed from DropNet",
    pathError: "Could not get this process path.",
    contextActions: "Actions for {name}",
    restoreInternetContext: "Restore internet access",
    blockInternetContext: "Block internet access",
    errorAlreadyAdded: "This executable is already in the list.",
    errorSelectExe: "Select an existing .exe file.",
    errorFirewallRejected: "Windows Firewall rejected the rule for {detail}",
    errorFirewallStillActive: "Windows Firewall still reports active rules for this program.",
    errorFirewallIncomplete: "Windows Firewall rules are incomplete for this program; refresh or unblock it to repair them.",
    errorFirewallUnconfirmed: "Windows Firewall did not confirm the requested state.",
    errorUnblockAll: "Could not unblock all programs: {detail}",
    errorResolvePath: "Could not resolve executable path: {detail}",
    errorCouldNotStartFirewall: "Could not start Windows Firewall: {detail}",
    errorReadPrograms: "Could not read saved programs: {detail}",
    errorSavePrograms: "Could not save programs: {detail}",
    errorCouldNotSave: "Could not complete the save: {detail}",
    errorGeneric: "Operation failed: {detail}",
    confirmBlockTitle: "Block internet access for {name}?",
    confirmBlockScope: "This applies to every running process using this exact executable. Child processes with a different .exe are not blocked automatically.",
    confirmBlockPath: "Executable path",
    doNotAskAgain: "Don't ask again",
    cancel: "Cancel",
    confirmBlock: "Yes, block access",
    exitBlockedTitle: "Blocked programs are still active",
    exitBlockedDescription: "DropNet will remove its Firewall rules before exiting, restoring network access for these programs.",
    exitRecoveryHint: "If the check fails, DropNet will stay open so you can retry or attempt to remove all DropNet rules.",
    exitChecking: "Checking Firewall rules…",
    exitUnblockAndClose: "Unblock and exit",
    exitKeepOpen: "Keep open",
    exitRetry: "Retry check",
    startupRecoveryFailure: "Could not restore access for all saved programs at startup: {detail}",
    startupRecoveryTitle: "Internet access restored",
    startupRecoveryDescription: "These saved executable paths had DropNet Firewall rules, which were removed during startup recovery:",
    startupRecoveryFailureTitle: "Startup recovery needs attention",
    startupRecoveryFailedDescription: "DropNet could not fully check or restore these saved executable paths:",
    startupConfigurationRecovered: "The saved list was recovered from its previous backup. Recent changes may be missing, so review any remaining DropNet Firewall rules.",
    startupConfigurationRecoveryTitle: "Saved program list recovered",
    errorBoundaryTitle: "The interface encountered an error",
    errorBoundaryDescription: "Firewall rules may still be active. You can retry the interface or attempt to remove DropNet rules before restarting.",
    errorBoundaryDetail: "Error",
    errorBoundaryRetry: "Restart interface",
    errorBoundaryUnblockAndReload: "Remove DropNet rules and restart",
    errorBoundaryWorking: "Removing rules…",
  },
  es: {
    ...logTranslations.es,
    ...tableTranslations.es,
    language: "Idioma",
    restoreBlockConfirmation: "Activar confirmaciones de bloqueo",
    confirmationsOff: "Confirmaciones desactivadas",
    minimize: "Minimizar",
    maximize: "Maximizar",
    restore: "Restaurar",
    close: "Cerrar",
    windowControls: "Controles de ventana",
    cutInternet: "Cortar internet",
    restoreInternet: "Restaurar",
    restoreAll: "Restaurar todo",
    remove: "Quitar",
    addExe: "Agregar .exe",
    applications: "Aplicaciones",
    show: "Mostrar:",
    all: "Todos",
    online: "Con internet",
    blocked: "Bloqueados",
    windows: "Windows",
    processColumn: "Proceso",
    pathColumn: "Ubicación del ejecutable",
    stateColumn: "Estado",
    resizeProcess: "Cambiar ancho de Proceso",
    resizePath: "Cambiar ancho de Ubicación del ejecutable",
    runningProcesses: "Procesos en ejecución",
    collapse: "Contraer",
    expand: "Expandir",
    blockedStatus: "Bloqueado",
    allowedStatus: "Permitido",
    fileMissing: "El archivo ya no existe",
    pathUnavailable: "Ruta no disponible",
    noMatchingProcesses: "No hay procesos que coincidan con el filtro.",
    trySearchOrRefresh: "Prueba otra búsqueda o actualiza la lista.",
    selectProcess: "Selecciona un proceso",
    chooseProcessPath: "Elige un proceso de la lista para ver su ruta.",
    notRunning: "No está en ejecución",
    noInternet: "Sin internet",
    withInternet: "Con internet",
    searchProcesses: "Buscar procesos",
    refresh: "Actualizar",
    restartHint: "Reinicia el programa después de bloquearlo o restaurar el acceso para que el cambio se aplique.",
    recoveryHint: "Si DropNet se cierra inesperadamente o se corta la energía, Windows puede mantener estos bloqueos. DropNet intentará restablecer el acceso la próxima vez que se inicie.",
    waitForAction: "Espera a que termine la operación actual y vuelve a revisar.",
    firewallStateUnavailable: "DropNet no pudo comprobar el estado actual del Firewall. Puedes reintentar o quitar todas las reglas de DropNet antes de salir.",
    listUpdated: "Lista actualizada",
    processCount: "{processCount} {processLabel} · {blockedCount} bloqueados",
    processSingular: "proceso",
    processPlural: "procesos",
    runningAsAdmin: "Ejecutando como administrador",
    adminRequired: "Se requieren permisos de administrador",
    adminWarning: "Ejecuta DropNet como administrador para modificar las reglas del Firewall.",
    ready: "Listo",
    dragExe: "Arrastra archivos .exe para agregarlos.",
    addedOne: "Se agregó 1 archivo",
    addedMany: "Se agregaron {count} archivos",
    addedFilesWithErrors: "{addedSummary}. No se pudieron agregar: {errors}",
    couldNotAddFiles: "No se pudieron agregar: {errors}",
    programAdded: "Programa agregado",
    internetBlocked: "Acceso a internet bloqueado",
    internetRestored: "Acceso a internet restaurado",
    firewallUnconfirmed: "Windows Firewall no confirmó el cambio solicitado.",
    rulesRemoved: "Reglas de DropNet eliminadas",
    programRemoved: "Programa quitado de DropNet",
    pathError: "No se pudo obtener la ruta de este proceso.",
    contextActions: "Acciones para {name}",
    restoreInternetContext: "Restaurar acceso a internet",
    blockInternetContext: "Cortar acceso a internet",
    errorAlreadyAdded: "Este ejecutable ya está en la lista.",
    errorSelectExe: "Selecciona un archivo .exe existente.",
    errorFirewallRejected: "Windows Firewall rechazó la regla para {detail}",
    errorFirewallStillActive: "Windows Firewall todavía informa reglas activas para este programa.",
    errorFirewallIncomplete: "Las reglas de Windows Firewall están incompletas; actualiza o desbloquea el programa para repararlas.",
    errorFirewallUnconfirmed: "Windows Firewall no confirmó el estado solicitado.",
    errorUnblockAll: "No se pudieron desbloquear todos los programas: {detail}",
    errorResolvePath: "No se pudo resolver la ruta del ejecutable: {detail}",
    errorCouldNotStartFirewall: "No se pudo ejecutar Windows Firewall: {detail}",
    errorReadPrograms: "No se pudieron leer los programas guardados: {detail}",
    errorSavePrograms: "No se pudieron guardar los programas: {detail}",
    errorCouldNotSave: "No se pudo completar el guardado: {detail}",
    errorGeneric: "No se pudo completar la operación: {detail}",
    confirmBlockTitle: "¿Bloquear el acceso a internet de {name}?",
    confirmBlockScope: "Esto se aplica a todos los procesos que usen este ejecutable. Los procesos hijos con otro archivo .exe no se bloquean automáticamente.",
    confirmBlockPath: "Ruta del ejecutable",
    doNotAskAgain: "No volver a preguntar",
    cancel: "Cancelar",
    confirmBlock: "Sí, bloquear acceso",
    exitBlockedTitle: "Hay programas bloqueados",
    exitBlockedDescription: "DropNet quitará sus reglas del Firewall antes de cerrar y restablecerá el acceso a internet de estos programas.",
    exitRecoveryHint: "Si la comprobación falla, DropNet permanecerá abierto para que puedas reintentar o quitar todas sus reglas.",
    exitChecking: "Comprobando las reglas del Firewall…",
    exitUnblockAndClose: "Desbloquear y salir",
    exitKeepOpen: "Mantener abierto",
    exitRetry: "Revisar nuevamente",
    startupRecoveryFailure: "No se pudo restablecer el acceso de todos los programas guardados al iniciar: {detail}",
    startupRecoveryTitle: "Acceso a internet restablecido",
    startupRecoveryDescription: "Estas rutas guardadas tenían reglas del Firewall de DropNet, que se quitaron al iniciar la recuperación:",
    startupRecoveryFailureTitle: "La recuperación al iniciar requiere atención",
    startupRecoveryFailedDescription: "DropNet no pudo comprobar o restaurar por completo estas rutas guardadas:",
    startupConfigurationRecovered: "La lista guardada se recuperó desde su respaldo anterior. Es posible que falten cambios recientes; revisa si quedan reglas de DropNet activas en el Firewall.",
    startupConfigurationRecoveryTitle: "Lista de programas recuperada",
    errorBoundaryTitle: "La interfaz encontró un error",
    errorBoundaryDescription: "Es posible que algunas reglas del Firewall sigan activas. Puedes reiniciar la interfaz o intentar quitar las reglas de DropNet antes de reiniciar.",
    errorBoundaryDetail: "Error",
    errorBoundaryRetry: "Reiniciar interfaz",
    errorBoundaryUnblockAndReload: "Quitar reglas de DropNet y reiniciar",
    errorBoundaryWorking: "Quitando reglas…",
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
type TranslationValues = Record<string, string | number>;
type TranslationContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  formatError: (error: unknown) => string;
};

const LANGUAGE_STORAGE_KEY = "dropnet.language";
const TranslationContext = createContext<TranslationContextValue | null>(null);

function readInitialLanguage(): Language {
  try {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage === "es" || storedLanguage === "en" ? storedLanguage : "en";
  } catch {
    return "en";
  }
}

function interpolate(template: string, values: TranslationValues = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

function errorTranslationKey(message: string): TranslationKey | null {
  if (message === "This executable is already in the list.") return "errorAlreadyAdded";
  if (message === "Select an existing .exe file.") return "errorSelectExe";
  if (message.startsWith("Windows Firewall rejected the rule for ")) return "errorFirewallRejected";
  if (message === "Windows Firewall still reports active rules for this program.") return "errorFirewallStillActive";
  if (message.startsWith("Windows Firewall rules are incomplete")) return "errorFirewallIncomplete";
  if (message === "Windows Firewall did not confirm the requested state.") return "errorFirewallUnconfirmed";
  if (message.startsWith("Could not unblock all programs: ")) return "errorUnblockAll";
  if (message.startsWith("Could not resolve executable path: ")) return "errorResolvePath";
  if (message.startsWith("Could not start Windows Firewall: ")) return "errorCouldNotStartFirewall";
  if (message.startsWith("Could not read saved programs: ")) return "errorReadPrograms";
  if (message.startsWith("Could not save programs: ")) return "errorSavePrograms";
  if (message.startsWith("Could not complete the save: ")) return "errorCouldNotSave";
  if (message.startsWith("Could not restore access for all saved programs at startup: ")) return "startupRecoveryFailure";
  return null;
}

function errorValues(key: TranslationKey, message: string): TranslationValues {
  if (key === "errorFirewallRejected") return { detail: message.slice("Windows Firewall rejected the rule for ".length).replace(/\.$/, "") };
  if (key === "errorUnblockAll") return { detail: message.slice("Could not unblock all programs: ".length) };
  if (key === "errorResolvePath") return { detail: message.slice("Could not resolve executable path: ".length) };
  if (key === "errorCouldNotStartFirewall") return { detail: message.slice("Could not start Windows Firewall: ".length) };
  if (key === "errorReadPrograms") return { detail: message.slice("Could not read saved programs: ".length) };
  if (key === "errorSavePrograms") return { detail: message.slice("Could not save programs: ".length) };
  if (key === "errorCouldNotSave") return { detail: message.slice("Could not complete the save: ".length) };
  if (key === "startupRecoveryFailure") return { detail: message.slice("Could not restore access for all saved programs at startup: ".length) };
  return {};
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* Keep the in-memory selection. */ }
  }, [language]);

  const t = useCallback((key: TranslationKey, values?: TranslationValues) => interpolate(translations[language][key], values), [language]);
  const formatError = useCallback((error: unknown) => {
    const message = String(error);
    if (language === "es") {
      const key = errorTranslationKey(message);
      return key ? interpolate(translations.es[key], errorValues(key, message)) : message;
    }
    return message;
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t, formatError }), [language, t, formatError]);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) throw new Error("useTranslation must be used inside I18nProvider");
  return context;
}
