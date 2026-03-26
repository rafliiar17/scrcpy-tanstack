import { QueryClient } from "@tanstack/react-query";
import { QUERY_RETRY, QUERY_RETRY_DELAY_MS } from "./config";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: QUERY_RETRY,
      retryDelay: QUERY_RETRY_DELAY_MS,
      refetchOnWindowFocus: false, // desktop app, not a browser tab
    },
  },
});
