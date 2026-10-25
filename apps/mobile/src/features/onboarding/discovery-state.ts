import AsyncStorage from "@react-native-async-storage/async-storage";

const completionMarker = "blockout:v2-discovery-complete";

/** Reads only this installation's common V2 discovery flag; storage failures remain retryable. */
export async function readDiscoveryCompletion(): Promise<boolean> {
  return (await AsyncStorage.getItem(completionMarker)) === "true";
}

/** Persists explicit finish or skip, independently of initialization, identity, release and advertising. */
export async function completeDiscovery(): Promise<void> {
  await AsyncStorage.setItem(completionMarker, "true");
}
