// app/_layout.tsx
import React from 'react';
import { Stack, Slot } from 'expo-router';
import { Auth0Provider } from 'react-native-auth0';
import { auth0Config } from '../config/auth-config';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Auth0Provider
        domain={auth0Config.domain}
        clientId={auth0Config.clientId}
      >
        <Stack screenOptions={{ headerTitle: 'test' }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(protected)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </Auth0Provider>
    </ThemeProvider>
  );
}