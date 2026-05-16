"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { ApiError } from "@/generated/core/ApiError";

function onUnauthorized(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    window.dispatchEvent(new Event("auth:unauthorized"));
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: onUnauthorized }),
        mutationCache: new MutationCache({ onError: onUnauthorized }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) =>
              !(error instanceof ApiError && error.status === 401) && failureCount < 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

