import { Platform } from "react-native";

export const CONFIG = {
  AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN || "",
  AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || "",
  AUTH0_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_WEB_CLIENT_ID || "",
  AUTH0_AUDIENCE: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || "",
  API_MATCHES_BASE_URL: process.env.EXPO_PUBLIC_API_MATCHES_BASE_URL || "",
  API_POOLS_BASE_URL: process.env.EXPO_PUBLIC_API_POOLS_BASE_URL || "",
  API_TEAMS_BASE_URL: process.env.EXPO_PUBLIC_API_TEAMS_BASE_URL || "",
  API_COMPETITIONS_BASE_URL:
    process.env.EXPO_PUBLIC_API_COMPETITIONS_BASE_URL || "",
  API_USERS_BASE_URL: process.env.EXPO_PUBLIC_API_USERS_BASE_URL || "",
  API_SEARCH_BASE_URL: process.env.EXPO_PUBLIC_API_SEARCH_BASE_URL || "",
  API_GATEWAY_BASE_URL: process.env.EXPO_PUBLIC_API_GATEWAY_BASE_URL || "",
  API_CONFIG_BASE_URL: process.env.EXPO_PUBLIC_API_CONFIG_BASE_URL || "",
  API_CLUBS_BASE_URL: process.env.EXPO_PUBLIC_API_CLUBS_BASE_URL || "",
  API_REPORTS_BASE_URL: process.env.EXPO_PUBLIC_API_REPORTS_BASE_URL || "",
  API_NOTIFICATIONS_BASE_URL:
    process.env.EXPO_PUBLIC_API_NOTIFICATIONS_BASE_URL || "",
  MAP_URL: process.env.EXPO_PUBLIC_MAP_URL || "",
  INSTAGRAM_URL: process.env.EXPO_PUBLIC_INSTAGRAM_URL || "",
  ENTITLEMENT_BLOCKOUT_PRO:
    process.env.EXPO_PUBLIC_ENTITLEMENT_BLOCKOUT_PRO || "",
  REVENUECAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || "",
  REVENUECAT_ANDROID_API_KEY:
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || "",
};

export const AUTH0_CONFIG = {
  domain: CONFIG.AUTH0_DOMAIN,
  clientId:
    Platform.OS === "web" && CONFIG.AUTH0_WEB_CLIENT_ID
      ? CONFIG.AUTH0_WEB_CLIENT_ID
      : CONFIG.AUTH0_CLIENT_ID,
  audience: CONFIG.AUTH0_AUDIENCE,
};

type RequiredPublicConfig = Pick<
  typeof CONFIG,
  | "AUTH0_DOMAIN"
  | "AUTH0_CLIENT_ID"
  | "AUTH0_WEB_CLIENT_ID"
  | "AUTH0_AUDIENCE"
  | "API_GATEWAY_BASE_URL"
>;

export function validateRequiredConfig(
  config: RequiredPublicConfig = CONFIG,
  platform = Platform.OS,
) {
  const requiredValues = [
    ["EXPO_PUBLIC_AUTH0_DOMAIN", config.AUTH0_DOMAIN],
    ["EXPO_PUBLIC_AUTH0_AUDIENCE", config.AUTH0_AUDIENCE],
    ["EXPO_PUBLIC_API_GATEWAY_BASE_URL", config.API_GATEWAY_BASE_URL],
    platform === "web"
      ? ["EXPO_PUBLIC_AUTH0_WEB_CLIENT_ID", config.AUTH0_WEB_CLIENT_ID]
      : ["EXPO_PUBLIC_AUTH0_CLIENT_ID", config.AUTH0_CLIENT_ID],
  ] as const;

  const missingVariables = requiredValues
    .filter(([, value]) => value.trim().length === 0)
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required Expo public configuration: ${missingVariables.join(", ")}`,
    );
  }
}
