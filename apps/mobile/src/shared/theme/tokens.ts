import type { TextStyle } from "react-native";

/** Approved UI Library projection, read 2026-10-17; palettes remain implementation details.
 * Sources: https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=7-3
 * Typography/layout/effects: sibling foundation pages 7:4–7:6; control nodes are linked by quickstart.
 */
const reference = { white: "#FFFFFF", neutral900: "#171717" };

/** Sporting owners supply both approved appearances; the theme never derives division colors. */
export interface ContextColors {
  primary: string;
  actionStart: string;
  actionEnd: string;
  onAction: string;
  shadow: string;
}

/** Semantic roles used by the first controls, retaining identical keys in both Figma modes. */
export const appearanceColors = {
  light: {
    canvas: "#FCFCFD",
    surface: reference.white,
    subtle: "#2021240F",
    mediaPlaceholder: "#EDEDEE",
    raised: "#FFFFFFF7",
    border: "#20212424",
    text: "#1C1C1E",
    secondaryText: "#62646A",
    icon: "#1C1C1E",
    error: "#B42340",
    focus: "#555555",
  },
  dark: {
    canvas: "#0D0D0E",
    surface: "#19191A",
    subtle: "#FFFFFF14",
    mediaPlaceholder: "#2B2B2D",
    raised: "#181819F5",
    border: "#FFFFFF2E",
    text: "#F7F7F8",
    secondaryText: "#B8B8BC",
    icon: "#F7F7F8",
    error: "#FFB3C3",
    focus: "#F7F7F8",
  },
};

/** Context Color/Neutral aliases resolved through the current Semantic Color appearance. */
export const neutralContext: { light: ContextColors; dark: ContextColors } = {
  light: {
    primary: reference.neutral900,
    actionStart: reference.neutral900,
    actionEnd: "#383837",
    onAction: reference.white,
    shadow: "#00000014",
  },
  dark: {
    primary: "#F1F1F2",
    actionStart: "#F7F7F8",
    actionEnd: "#DCDCDF",
    onAction: reference.neutral900,
    shadow: "#00000038",
  },
};

/** Membership aliases retain both Semantic Color appearances; eligibility never changes sporting context. */
export const membershipColors = {
  light: {
    fill: reference.neutral900,
    content: reference.white,
    border: "#20212424",
  },
  dark: { fill: "#F1F1F2", content: reference.neutral900, border: "#FFFFFF2E" },
  pro: {
    light: { fill: "#E7D39B", content: "#201E19", border: "#C1AA68" },
    dark: { fill: "#E2C985", content: "#201E19", border: "#A99662" },
  },
};

/** Core, Typography, Motion and Platform roles needed by the initial controls, without a styling engine. */
export const tokens = {
  spacing: { xs: 4, sm: 8, md: 12, compact: 10, lg: 16, section: 24, label: 6 },
  radius: { control: 12, media: 16, sheet: 22, full: 999 },
  size: { control: 48, multiline: 96, actionIcon: 24, loading: 20 },
  touchTarget: { ios: 44, android: 48 },
  borderWidth: 1,
  opacity: { disabled: 0.45, pressed: 0.9 },
  elevation: { offsetX: 0, offsetY: 4, blur: 10 },
  motion: { slow: 480 },
  // Exact static face names preserve intermediate weights on Android versions before API 28.
  typography: {
    body: { fontFamily: "Outfit-Regular", fontSize: 14, lineHeight: 20 },
    strong: { fontFamily: "Outfit-SemiBold", fontSize: 14, lineHeight: 20 },
    heading: { fontFamily: "Outfit-Bold", fontSize: 20, lineHeight: 26 },
    // Figma letter spacing is percent; React Native uses logical points (13 × 1%, 12 × 2%).
    label: {
      fontFamily: "Outfit-SemiBold",
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.13,
    },
    metadata: {
      fontFamily: "Outfit-Medium",
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.24,
    },
  } satisfies Record<string, TextStyle>,
};
