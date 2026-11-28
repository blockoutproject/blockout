import { tokens } from "./tokens";

/** Selects the published media radius for a rendered frame's shorter side; identity insets use profile explicitly. */
export function mediaRadius(size: number): number {
  if (size <= 16) {
    return tokens.media.radius.inline;
  }
  if (size <= 24) {
    return tokens.media.radius.compact;
  }
  if (size <= 32) {
    return tokens.media.radius.list;
  }
  if (size <= 48) {
    return tokens.media.radius.tile;
  }
  if (size <= 64) {
    return tokens.media.radius.preview;
  }
  return tokens.media.radius.profile;
}
