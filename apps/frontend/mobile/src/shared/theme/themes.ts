export interface AppTheme {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  border: string;
  borderSecondary: string;
  text: string;
  textSecondary: string;
  textInactive: string;
  muted: string;
  onPrimary: string;
  hover: string;
  pressed: string;
  primary: string;
  success: string;
  error: string;
  warning: string;
  gold: string;
  silver: string;
  bronze: string;
  male: string;
  female: string;
}

export const darkTheme: AppTheme = {
  background: "#0b0c0d",
  backgroundSecondary: "#141414",
  surface: "#1a1a1aff",
  surfaceSecondary: "#2b2b2b",
  surfaceTertiary: "#393939",
  border: "#343434ff",
  borderSecondary: "#5f5f5fff",
  text: "#ffffff",
  textSecondary: "#cdcdcdff",
  textInactive: "#88898a",
  muted: "#78788033",
  onPrimary: "#18181b",
  hover: "#1c1d20",
  pressed: "#242528",
  primary: "#2d9cdb",
  success: "#61b543",
  error: "#d32738ff",
  warning: "#e6c84c",
  gold: "#CFAE70",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
  male: "#56a5dcff",
  female: "#df69a4ff",
};

export const poolBorderColorPalettes: readonly [string, string, ...string[]][] = [
  ["#00c480", "#006fd5", "#00bcd4"],
  ["#4800ff", "#9b00e8", "#e52e71"],
  ["#e1af30", "#ff8100", "#e52e71"],
];

export const poolColorPalettes: readonly [string, string, ...string[]][] = [
  ["#213d57", "#213d57"],
  ["#3e2c46", "#3e2c46"],
  ["#4c3d32", "#4c3d32"],
];
