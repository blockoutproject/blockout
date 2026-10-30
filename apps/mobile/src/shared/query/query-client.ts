import { QueryClient } from "@tanstack/react-query";

/** Creates an ordinary cache; its React owner determines public or private lifetime. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { networkMode: "always", retry: false },
    },
  });
}
