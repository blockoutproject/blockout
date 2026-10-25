import { relativeLuminance } from "../../../shared/theme/color-luminance";

/** UI Library Color 3193:116: use whichever black/white foreground has the greater contrast. */
export function divisionTextColor(primary: string): string {
  const luminance = relativeLuminance(primary);
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "#000000"
    : "#FFFFFF";
}
/** UI Library Color 3193:125: the ordinary endpoint is 8% darker, over the dynamic primary fill. */
export const automaticDivisionGradient =
  "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.08))";
