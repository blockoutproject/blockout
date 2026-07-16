import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

/**
 * Provides the single mobile-owned TanStack Query client to handwritten and future generated API hooks.
 *
 * @param props - Application content sharing the query cache.
 * @returns The mobile TanStack Query provider boundary.
 */
export function TanstackQueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
