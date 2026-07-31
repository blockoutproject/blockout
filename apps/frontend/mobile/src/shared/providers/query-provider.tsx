import React, { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import * as Network from "expo-network";

export const createMobileQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });

const queryClient = createMobileQueryClient();

export const useResetQueryCache = () => {
  const client = useQueryClient();

  return useCallback(async () => {
    await client.cancelQueries();
    client.clear();
  }, [client]);
};

export const QueryProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  useEffect(() => {
    focusManager.setFocused(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (status) => {
      focusManager.setFocused(status === "active");
    });

    return () => {
      subscription.remove();
      focusManager.setFocused(undefined);
    };
  }, []);

  useEffect(() => {
    let receivedEvent = false;
    const subscription = Network.addNetworkStateListener((state) => {
      receivedEvent = true;
      onlineManager.setOnline(!!state.isConnected);
    });

    void Network.getNetworkStateAsync()
      .then((state) => {
        if (!receivedEvent) onlineManager.setOnline(!!state.isConnected);
      })
      .catch(() => undefined);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
