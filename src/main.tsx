import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { I18nProvider } from "./i18n";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><I18nProvider><AppErrorBoundary><App /></AppErrorBoundary></I18nProvider></React.StrictMode>,
);
