/** Converts a six-digit sRGB color to WCAG relative luminance; callers own foreground policy and input validation. */
export function relativeLuminance(primary: string): number {
  const channels = [1, 3, 5].map((index) => {
    const value = Number.parseInt(primary.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
