/** Apply an alpha channel to the supported hexadecimal and RGB color inputs. */
export function withAlpha(color: string, alpha: number): string {
  if (!color) return `rgba(0,0,0,${alpha})`;

  if (color.startsWith("#")) {
    let hex = color.slice(1);

    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((character) => character + character)
        .join("");
    }

    if (hex.length === 8) {
      hex = hex.slice(0, 6);
    }

    if (hex.length === 6) {
      const red = parseInt(hex.slice(0, 2), 16);
      const green = parseInt(hex.slice(2, 4), 16);
      const blue = parseInt(hex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
  }

  if (color.startsWith("rgb")) {
    const channels = color.match(/\d+(\.\d+)?/g);
    if (channels && channels.length >= 3) {
      const [red, green, blue] = channels.slice(0, 3).map(Number);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
  }

  if (alpha === 1) return color;
  return `rgba(0,0,0,${alpha})`;
}
