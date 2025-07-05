import { AppTheme } from "../types/Theme";

export const darkTheme: AppTheme = {
    background: "#0b0c0d",
    backgroundSecondary: "#131313",
    surface: "#1c1c1c",
    surfaceSecondary: "#2b2b2b",
    surfaceTertiary: "#393939",
    border: "#3c3e42",
    borderSecondary: "#5a5b63",
    text: "#ffffff",
    textSecondary: "#e2e2e2",
    textTiertiary: "#000000",
    textInactive: "#88898a",
    hover: "#1c1d20",
    pressed: "#242528",
    primary: "#2d9cdb",
    success: "#609739",
    error: "#c83b48",
    warning: "#e6c84c",
    gold: "#FFD700",
    silver: "#C0C0C0",
    bronze: "#CD7F32",
};

export const lightTheme: AppTheme = {
    background: "#ffffff",
    backgroundSecondary: "#f5f5f5",
    surface: "#eaeaea",
    surfaceSecondary: "#dcdcdc",
    surfaceTertiary: "#cccccc",
    border: "#bdbdbd",
    borderSecondary: "#a6a6a6",
    text: "#0e1012",
    textSecondary: "#2a2b2f",
    textTiertiary: "#ffffff",
    textInactive: "#88898a",
    hover: "#dddddd",
    pressed: "#cccccc",
    primary: "#2d9cdb",
    success: "#609739",
    error: "#c83b48",
    warning: "#e6c84c",
    gold: "#FFD700",
    silver: "#C0C0C0",
    bronze: "#CD7F32",
};

export const poolBorderColorPalettes: readonly [string, string, ...string[]][] = [
  ['#00c480', '#006fd5', '#00bcd4'], // cyber-aqua
  ['#4800ff', '#9b00e8', '#e52e71'], // sunset
  ['#e1af30', '#ff8100', '#e52e71'], // néon
  // Ajoute d'autres palettes si besoin
];

export const poolColorPalettes: readonly [string, string, ...string[]][] = [
  ['#213d57', '#213d57'], // cyber-aqua
  ['#3e2c46', '#3e2c46'], // sunset
  ['#4c3d32', '#4c3d32'], // néon
  // Ajoute d'autres palettes si besoin
];