import React from "react";
import { StatusBar } from "react-native";
import { Stack } from "expo-router";
import { Auth0Provider } from "@/src/modules/session/auth/auth-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import {
  AUTH0_CONFIG,
  validateRequiredConfig,
} from "@/src/shared/config/config";
import { ThemeProvider, useAppTheme } from "@/src/shared/theme";
import { ApiProvider } from "@/src/shared/providers/api-provider";
import { SessionProvider } from "@/src/modules/session/providers/session-provider";
import { useSessionState } from "@/src/modules/session/providers/session-context";
import { SplashScreenController } from "@/src/modules/session/ui/splash-screen-controller";
import { useOnboardingStore } from "@/src/modules/onboarding/model/onboarding-store";
import { AdvertisingProvider } from "@/src/modules/advertising/providers/advertising-provider";
import { PurchasesProvider } from "@/src/modules/subscription/providers/purchases-provider";
import { configureRevenueCat } from "@/src/modules/subscription/providers/revenuecat-client";
import { QueryProvider } from "@/src/shared/providers/query-provider";
import { NotificationResponseController } from "@/src/modules/notifications/providers/notification-response-controller";
import { PushRegistrationController } from "@/src/modules/notifications/providers/push-registration-controller";
import { getRootNavigationState } from "@/src/modules/session/navigation/root-navigation-state";

const revenueCatConfiguration = configureRevenueCat();

export default function Root() {
  validateRequiredConfig();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <ThemeProvider>
            <StatusBar barStyle="light-content" />
            <Auth0Provider
              domain={AUTH0_CONFIG.domain}
              clientId={AUTH0_CONFIG.clientId}
            >
              <ApiProvider>
                <SessionProvider>
                  <PurchasesProvider configuration={revenueCatConfiguration}>
                    <AdvertisingProvider>
                      <NotificationResponseController />
                      <PushRegistrationController />
                      <SplashScreenController />
                      <RootNavigator />
                    </AdvertisingProvider>
                  </PurchasesProvider>
                </SessionProvider>
              </ApiProvider>
            </Auth0Provider>
          </ThemeProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const theme = useAppTheme();

  const {
    isAuthenticated,
    isGuest,
    isMaintenance,
    maintenanceBypass,
    isUpdateRequired,
    updateBypass,
  } = useSessionState();

  const { hasCompletedOnboarding } = useOnboardingStore();

  const navigation = getRootNavigationState({
    isAuthenticated,
    isGuest,
    isMaintenance,
    maintenanceBypass,
    isUpdateRequired,
    updateBypass,
    hasCompletedOnboarding,
  });

  return (
    <BottomSheetModalProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Protected guard={navigation.showMaintenance}>
          <Stack.Screen
            name="maintenance"
            options={{ animation: "fade_from_bottom", animationDuration: 300 }}
          />
        </Stack.Protected>

        <Stack.Protected guard={navigation.showUpdateRequired}>
          <Stack.Screen
            name="update-required"
            options={{ animation: "fade_from_bottom", animationDuration: 300 }}
          />
        </Stack.Protected>

        <Stack.Protected guard={navigation.showSignIn}>
          <Stack.Screen
            name="sign-in"
            options={{ animation: "fade_from_bottom", animationDuration: 300 }}
          />
        </Stack.Protected>

        <Stack.Protected guard={navigation.showApplication}>
          <Stack.Protected guard={navigation.showOnboarding}>
            <Stack.Screen
              name="onboarding"
              options={{
                animation: "fade_from_bottom",
                animationDuration: 300,
              }}
            />
          </Stack.Protected>

          <Stack.Screen
            name="(tabs)"
            options={{ animation: "fade_from_bottom", animationDuration: 300 }}
          />
          <Stack.Screen
            name="pdf-viewer"
            options={{
              title: "Document",
              presentation: "modal",
              animation: "fade_from_bottom",
              animationDuration: 300,
            }}
          />
        </Stack.Protected>
      </Stack>
    </BottomSheetModalProvider>
  );
}
