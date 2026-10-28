import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";

const installationKey = "blockout:push-installation";

/** Reads or persists a random, non-sensitive installation identity independent of account and OS. */
export async function readPushInstallation(): Promise<string> {
  const existing = await AsyncStorage.getItem(installationKey);
  if (existing) return existing;
  const id = randomUUID();
  await AsyncStorage.setItem(installationKey, id);
  return id;
}
