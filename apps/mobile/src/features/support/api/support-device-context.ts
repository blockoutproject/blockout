import { nativeApplicationVersion } from "expo-application";
import { Platform } from "react-native";
import type { SupportContextRequest } from "../../../../.generated/schemas/index.zod";

/** Native facts only, without installation, advertising or device identifiers; unknown/oversized facts stay absent. */
export function supportDeviceContext(): SupportContextRequest {
  const context: SupportContextRequest = {};
  if (Platform.OS === "ios" || Platform.OS === "android") {
    context.platform = Platform.OS;
  }
  let version: string | undefined;
  if (Platform.OS === "android") {
    version = Platform.constants.Release;
  } else if (
    typeof Platform.Version === "string" ||
    typeof Platform.Version === "number"
  ) {
    version = String(Platform.Version);
  }
  if (usefulText(nativeApplicationVersion)) {
    context.appVersion = nativeApplicationVersion;
  }
  if (usefulText(version)) {
    context.osVersion = version;
  }
  if (Platform.OS === "android" && usefulText(Platform.constants.Model)) {
    context.deviceModel = Platform.constants.Model;
  }
  return context;
}

/** Enforces the canonical optional-text bound without truncating native values into invented facts. */
function usefulText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}
