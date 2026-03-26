import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { DeviceProvider } from "@/hooks/use-devices";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DeviceProvider>
        <App />
      </DeviceProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
