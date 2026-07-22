import {LiveProviderEnum} from "@/src/shared/generated/models";

/** User-facing labels for the generated live provider values. */
export const LIVE_PROVIDER_LABELS: Record<LiveProviderEnum, string> = {
  [LiveProviderEnum.YOUTUBE]: "YouTube",
  [LiveProviderEnum.TWITCH]: "Twitch",
  [LiveProviderEnum.FACEBOOK]: "Facebook",
};
