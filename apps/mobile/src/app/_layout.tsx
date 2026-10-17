import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Slot } from "expo-router";
import { useState } from "react";
import { createQueryClient } from "../shared/query/query-client";
import { initializeSentry } from "../shared/observability/sentry";

initializeSentry();

/** Keeps one in-memory Query client for the mounted native route tree. */
function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
