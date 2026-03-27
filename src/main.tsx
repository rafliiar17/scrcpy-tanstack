import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { DeviceProvider } from "@/hooks/use-devices";
import { ThemeProvider } from "@/hooks/use-theme";
import { SettingsProvider } from "@/hooks/use-settings";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <DeviceProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </DeviceProvider>
      </SettingsProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
