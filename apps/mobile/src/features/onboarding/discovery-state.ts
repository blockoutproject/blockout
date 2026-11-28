import AsyncStorage from "@react-native-async-storage/async-storage";

const completionMarker = "blockout:v2-discovery-complete";

/** Reads only this installation's optional discovery flag; its owner treats failure as incomplete. */
export async function readDiscoveryCompletion(): Promise<boolean> {
  return (await AsyncStorage.getItem(completionMarker)) === "true";
}

/** Persists explicit finish or skip, independently of initialization, identity, release and advertising. */
export async function completeDiscovery(): Promise<void> {
  await AsyncStorage.setItem(completionMarker, "true");
}
