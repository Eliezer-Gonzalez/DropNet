import { Component, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logFrontendError } from "../lib/logError";
import { useTranslation } from "../i18n";
import type { TranslationKey } from "../i18n";

interface Props {
  children: ReactNode;
  t: (key: TranslationKey) => string;
  formatError: (error: unknown) => string;
}

interface State {
  error: Error | null;
  busy: boolean;
}

class ErrorBoundaryView extends Component<Props, State> {
  state: State = { error: null, busy: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    void logFrontendError("react_render_error", error);
  }

  reloadInterface = () => window.location.reload();

  unblockAndReload = async () => {
    this.setState({ busy: true });
    try {
      await invoke("unblock_all");
      window.location.reload();
    } catch (error) {
      void logFrontendError("error_boundary_unblock_all", error);
      this.setState({ error: new Error(this.props.formatError(error)), busy: false });
    }
  };

  render() {
    const { error, busy } = this.state;
    if (!error) return this.props.children;

    return <main className="app-window">
      <div className="modal-backdrop">
        <section className="block-confirmation-modal" role="alert">
          <div className="block-modal-heading"><h1>{this.props.t("errorBoundaryTitle")}</h1></div>
          <p className="block-modal-scope">{this.props.t("errorBoundaryDescription")}</p>
          <p className="block-modal-scope">{this.props.t("errorBoundaryDetail")}: {error.message}</p>
          <div className="block-modal-actions">
            <button type="button" className="modal-cancel-button" disabled={busy} onClick={this.reloadInterface}>
              {this.props.t("errorBoundaryRetry")}
            </button>
            <button type="button" className="modal-confirm-button" disabled={busy} onClick={() => void this.unblockAndReload()}>
              {this.props.t(busy ? "errorBoundaryWorking" : "errorBoundaryUnblockAndReload")}
            </button>
          </div>
        </section>
      </div>
    </main>;
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { t, formatError } = useTranslation();
  return <ErrorBoundaryView t={t} formatError={formatError}>{children}</ErrorBoundaryView>;
}
