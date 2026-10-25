/** UI Library Color 3193:116: use whichever black/white foreground has the greater contrast. */
export function divisionTextColor(primary: string): string {
  const channels = [1, 3, 5].map((index) => {
    const value = Number.parseInt(primary.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "#000000"
    : "#FFFFFF";
}
/** UI Library Color 3193:125: the ordinary endpoint is 8% darker, over the dynamic primary fill. */
export const automaticDivisionGradient =
  "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.08))";
