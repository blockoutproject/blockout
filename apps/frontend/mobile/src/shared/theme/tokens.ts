import type { TextStyle, ViewStyle } from "react-native";

export const product = {
  name: "Blockout",
} as const;

export const colors = {
  background: {
    default: "#0b0c0d",
    secondary: "#141414",
  },
  surface: {
    default: "#1a1a1a",
    secondary: "#2b2b2b",
    tertiary: "#393939",
    selected: "#5f5f5f",
  },
  border: {
    default: "#343434",
    strong: "#5f5f5f",
  },
  text: {
    primary: "#ffffff",
    secondary: "#cdcdcd",
    inactive: "#88898a",
    onPrimary: "#18181b",
  },
  icon: {
    primary: "#ffffff",
    inactive: "#88898a",
    onPrimary: "#18181b",
  },
  interaction: {
    hover: "#1c1d20",
    pressed: "#242528",
  },
  overlay: {
    muted: "#78788033",
  },
  status: {
    primary: "#2d9cdb",
    success: "#61b543",
    error: "#d32738",
    warning: "#e6c84c",
  },
  premium: {
    gold: "#cfae70",
  },
  ranking: {
    silver: "#c0c0c0",
    bronze: "#cd7f32",
  },
  gender: {
    male: "#56a5dc",
    female: "#df69a4",
  },
} as const;

export const gradients = {
  action: ["#24b3c9", "#8f8bfa", "#f472b6"],
  premium: ["#fedc84", "#cfae70", "#9e844c"],
  poolBorders: [
    ["#00c480", "#006fd5", "#00bcd4"],
    ["#4800ff", "#9b00e8", "#e52e71"],
    ["#e1af30", "#ff8100", "#e52e71"],
  ],
} as const;

export const poolFills = [
  ["#213d57", "#213d57"],
  ["#3e2c46", "#3e2c46"],
  ["#4c3d32", "#4c3d32"],
] as const;

export const spacing = {
  0: 0,
  optical: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  card: 14,
  lg: 16,
  hero: 18,
  xl: 24,
  control: 16,
  full: 999,
} as const;

export const borderWidth = {
  thin: 1,
  medium: 2,
  strong: 3,
} as const;

export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  navigation: 28,
  xl: 32,
} as const;

export const touchTarget = {
  minimum: 44,
} as const;

export const stateOpacity = {
  disabled: 0.45,
  loading: 0.75,
  pressed: 0.9,
} as const;

export const layout = {
  bottomNavigation: 64,
  followedHeader: 54,
  header: 48,
  logoCompact: 40,
  logoHero: 96,
  search: 36,
  sectionSeparator: 12,
  tabIndicator: 3,
  tabs: 48,
} as const;

const system = {
  fontWeight: {
    regular: "400",
    medium: "500",
    semiBold: "600",
    bold: "700",
    black: "900",
  },
} as const;

export const typography = {
  brandDisplay: {
    fontFamily: "Outfit",
    fontSize: 30,
    fontWeight: system.fontWeight.black,
    lineHeight: 36,
  },
  brandDisplayRegular: {
    fontFamily: "Outfit",
    fontSize: 30,
    fontWeight: system.fontWeight.regular,
    lineHeight: 36,
  },
  body: {
    fontSize: 14,
    fontWeight: system.fontWeight.regular,
    lineHeight: 20,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: system.fontWeight.semiBold,
    lineHeight: 22,
  },
  caption: {
    fontSize: 11,
    fontWeight: system.fontWeight.regular,
    lineHeight: 16,
  },
  captionStrong: {
    fontSize: 11,
    fontWeight: system.fontWeight.semiBold,
    lineHeight: 16,
  },
  compactStrong: {
    fontSize: 14,
    fontWeight: system.fontWeight.bold,
    lineHeight: 18,
  },
  control: {
    fontSize: 16,
    fontWeight: system.fontWeight.bold,
    lineHeight: 22,
  },
  display: {
    fontSize: 30,
    fontWeight: system.fontWeight.black,
    lineHeight: 36,
  },
  heading: {
    fontSize: 20,
    fontWeight: system.fontWeight.bold,
    lineHeight: 28,
  },
  hero: {
    fontSize: 40,
    fontWeight: system.fontWeight.black,
    lineHeight: 48,
  },
  label: {
    fontSize: 13,
    fontWeight: system.fontWeight.bold,
    lineHeight: 18,
  },
  metadata: {
    fontSize: 12,
    fontWeight: system.fontWeight.medium,
    lineHeight: 16,
  },
  metadataStrong: {
    fontSize: 12,
    fontWeight: system.fontWeight.bold,
    lineHeight: 16,
  },
  micro: {
    fontSize: 11,
    fontWeight: system.fontWeight.semiBold,
    lineHeight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: system.fontWeight.black,
    lineHeight: 24,
  },
} as const satisfies Record<string, TextStyle>;

export const elevation = {
  action: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  hero: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  image: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  navigation: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 14,
  },
} as const satisfies Record<string, ViewStyle>;
