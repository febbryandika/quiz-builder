import { isServer, QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Above zero so hydrated data isn't refetched immediately on the client
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) {
    // New client per server request — never share cache across requests
    return makeQueryClient();
  }
  // Browser singleton — survives React suspending during initial render
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
