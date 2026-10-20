import AsyncStorage from "@react-native-async-storage/async-storage";
import type Auth0 from "react-native-auth0";

const initializationMarker = "blockout:v2-initialized";
let pendingInitialization: Promise<void> | undefined;

/**
 * Clears retained credentials once per installation before Auth0Provider may mount.
 * Concurrent mount attempts share the same operation; rejection permits an explicit retry.
 * @param auth0 The application's native SDK client, created before mounting its provider.
 * @returns Completion only after the stable installation marker has been persisted or read.
 * @throws If storage or SDK operations reject; SDK clearing results are trusted.
 */
export function initializeV2Installation(auth0: Auth0): Promise<void> {
  pendingInitialization ??= initialize(auth0).finally(() => {
    pendingInitialization = undefined;
  });
  return pendingInitialization;
}

/**
 * Writes only the initialization flag, leaving discovery, age and other installation state intact.
 * @param auth0 Native client responsible for clearing retained credentials.
 */
async function initialize(auth0: Auth0): Promise<void> {
  if ((await AsyncStorage.getItem(initializationMarker)) === "true") {
    return;
  }

  await auth0.credentialsManager.clearCredentials();
  await AsyncStorage.setItem(initializationMarker, "true");
}
