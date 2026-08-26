import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      offset={18}
      toastOptions={{
        className: "!rounded-xl !border-border !bg-card !text-foreground !shadow-lg",
      }}
    />
  </React.StrictMode>,
);
