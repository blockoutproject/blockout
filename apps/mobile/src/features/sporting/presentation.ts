import { contrastColor } from "react-native-reanimated";

/** UI Library Color 3193:116: choose the higher-contrast black or white foreground on a valid sRGB primary. */
export function divisionTextColor(primary: string): string {
  return contrastColor(primary) === "black" ? "#000000" : "#FFFFFF";
}
