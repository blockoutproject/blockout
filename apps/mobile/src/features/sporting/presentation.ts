import { relativeLuminance } from "../../shared/theme/color-luminance";

/** UI Library Color 3193:116: choose the higher-contrast black or white foreground on a valid sRGB primary. */
export function divisionTextColor(primary: string): string {
  const luminance = relativeLuminance(primary);
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "#000000"
    : "#FFFFFF";
}
