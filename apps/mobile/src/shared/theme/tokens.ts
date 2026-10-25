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
    // UI Library media/logo-surface stays white in both appearances; monograms retain neutral ink.
    logoSurface: reference.white,
    logoInk: reference.neutral900,
    skeleton: "#EDEDEE",
    onDarkAccent: reference.white,
    onLightAccent: "#000000",
    raised: "#FFFFFFF7",
    // Semantic surface/inverse and text/on-inverse; Product Design follow action 1010:15711.
    inverse: reference.neutral900,
    onInverse: "#F7F7F8",
    contextBorderAlpha: "4D",
    border: "#20212424",
    text: "#1C1C1E",
    accentPrimary: reference.neutral900,
    secondaryText: "#62646A",
    icon: "#1C1C1E",
    error: "#B42340",
    focus: "#555555",
    // F12 maintenance control: Product Design 5978:48721 and 1450:14015.
    successAction: "#287E63",
    onSuccessAction: reference.white,
    successSubtle: "#287E6314",
    onSuccessSubtle: "#287E63",
    warning: "#F4C66A",
    onWarning: reference.neutral900,
    // F01 source status: Product Design 6664:88448 and 4823:40111.
    info: "#52697A",
    onInfo: reference.white,
    errorSubtle: "#B4234014",
  },
  dark: {
    canvas: "#0D0D0E",
    surface: "#19191A",
    subtle: "#FFFFFF14",
    mediaPlaceholder: "#2B2B2D",
    logoSurface: reference.white,
    logoInk: reference.neutral900,
    skeleton: "#2B2B2D",
    onDarkAccent: reference.white,
    onLightAccent: "#000000",
    raised: "#181819F5",
    inverse: "#F7F7F8",
    onInverse: reference.neutral900,
    contextBorderAlpha: "6B",
    border: "#FFFFFF2E",
    text: "#F7F7F8",
    accentPrimary: "#F1F1F2",
    secondaryText: "#B8B8BC",
    icon: "#F7F7F8",
    error: "#FFB3C3",
    focus: "#F7F7F8",
    // The action remains the same green; subtle feedback follows the dark semantic mode.
    successAction: "#287E63",
    onSuccessAction: reference.white,
    successSubtle: "#76BCA614",
    onSuccessSubtle: "#76BCA6",
    warning: "#F4C66A",
    onWarning: reference.neutral900,
    info: "#A9BBC7",
    onInfo: reference.neutral900,
    errorSubtle: "#FFB3C314",
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
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    compact: 10,
    lg: 16,
    xl: 20,
    section: 24,
    label: 6,
    tight: 6,
  },
  radius: {
    badge: 8,
    control: 12,
    media: 16,
    // Product Design Entity Card's Media/Image slot binds Core radius/media (6), not form media (16).
    entityMedia: 6,
    panelInset: 18,
    sheet: 22,
    full: 999,
  },
  size: {
    control: 48,
    compactControl: 36,
    multiline: 96,
    actionIcon: 24,
    controlIcon: 20,
    loading: 20,
    entityMedia: 48,
    smallIcon: 16,
    badge: 24,
    collectionToolbar: 44,
  },
  touchTarget: { ios: 44, android: 48 },
  borderWidth: 1,
  opacity: { disabled: 0.45, pressed: 0.9 },
  elevation: { offsetX: 0, offsetY: 4, blur: 10 },
  motion: { slow: 480 },
  // Select the bundled static face explicitly so approved weights stay consistent across platforms.
  typography: {
    body: { fontFamily: "Outfit-Regular", fontSize: 14, lineHeight: 20 },
    strong: { fontFamily: "Outfit-SemiBold", fontSize: 14, lineHeight: 20 },
    heading: { fontFamily: "Outfit-Bold", fontSize: 20, lineHeight: 26 },
    // UI Library Heading/XL and Display/Age (3681:14), used by Product Design 6650:4930.
    headingXl: {
      fontFamily: "Outfit-Bold",
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.32,
    },
    displayAge: {
      fontFamily: "Outfit-SemiBold",
      fontSize: 36,
      lineHeight: 50.4,
    },
    navigation: { fontFamily: "Outfit-Bold", fontSize: 16, lineHeight: 22 },
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
