import { contrastColor } from "react-native-reanimated";

/** UI Library Color 3193:116 pairs a solid accent with the higher-contrast ink. */
export function solidForeground(color: string): string {
  return contrastColor(color) === "black" ? "#000000" : "#FFFFFF";
}
