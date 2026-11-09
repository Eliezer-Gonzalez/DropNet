import { invoke } from "@tauri-apps/api/core";

export async function logFrontendError(operation: string, error: unknown) {
  const detail = error instanceof Error ? error.stack ?? error.message : String(error);
  try {
    await invoke("log_frontend_error", { operation, detail });
  } catch (loggingError) {
    console.error("Could not write the error to the DropNet log:", loggingError, error);
  }
}
