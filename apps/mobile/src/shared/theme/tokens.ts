import { Platform, type TextStyle } from "react-native";

/** Approved UI Library projection; common layout, size and platform roles rechecked 2026-10-26.
 * Palettes remain implementation details.
 * Sources: https://www.figma.com/design/l8EIQApzbfM24FwR0WKyAC/?node-id=7-3
 * Typography/layout/effects: sibling foundation pages 7:4–7:6; control nodes are linked by quickstart.
 */
const reference = { white: "#FFFFFF", neutral900: "#171717" };
const cardShadowBlurRadius = 12;
const cardShadowGeometry = `0px 4px ${cardShadowBlurRadius}px`;

/** Sporting owners supply both approved appearances; the theme never derives division colors. */
export interface ContextColors {
  primary: string;
  actionStart: string;
  actionEnd: string;
  onAction: string;
  shadow: string;
}

/** Semantic color roles retain identical keys in both Figma appearance modes. */
export const appearanceColors = {
  light: {
    canvas: "#FCFCFD",
    canvasHighlight: "#7E8FB2",
    canvasHighlightStart: 0.025,
    canvasTintStart: 0.01,
    canvasHighlightEnd: 0.05,
    canvasTintEnd: 0.05,
    surface: reference.white,
    subtle: "#2021240F",
    // Soft grouped surface approved through the native moderation review; its designated-library projection is tracked by F08.
    insetSurface: "#20212408",
    mediaPlaceholder: "#EDEDEE",
    // UI Library media/logo-surface stays white in both appearances; fallback content retains neutral ink.
    logoSurface: reference.white,
    logoInk: reference.neutral900,
    // UI Library rank/* semantic aliases; only an explicitly published position selects a medal.
    rank: {
      first: "#EDD79C",
      firstContent: "#4E3911",
      second: "#DCE2EC",
      secondContent: "#283344",
      third: "#EBBD9F",
      thirdContent: "#513423",
      neutral: "#EDEDF0",
    },
    // UI Library performance/*; the source must supply qualified won/lost counts.
    performance: { won: "#287E63", lost: "#C7CBD3" },
    skeleton: "#EDEDEE",
    // Published UI Library surface/skeleton-header; ink remains surface/skeleton in both regions.
    skeletonHeader: "#EBEBEB",
    onDarkAccent: reference.white,
    onLightAccent: "#000000",
    raised: "#FFFFFFF7",
    // Semantic surface/inverse and text/on-inverse; Product Design follow action 1010:15711.
    inverse: reference.neutral900,
    onInverse: "#F7F7F8",
    contextBorderAlpha: "4D",
    sportingSurfaceAlpha: "0C",
    calendarPoolSurfaceAlpha: "0A",
    calendarPoolHeaderAlpha: "14",
    border: "#20212424",
    cardShadow: `${cardShadowGeometry} #181C2E20`,
    capsuleShadow: "0px 5px 16px #14192426",
    text: "#1C1C1E",
    accentPrimary: reference.neutral900,
    secondaryText: "#62646A",
    icon: "#1C1C1E",
    error: "#B42340",
    // UI Library action/danger and text/on-strong-color own count badge contrast in both appearances.
    dangerAction: "#B42340",
    onDangerAction: reference.white,
    focus: "#555555",
    overlayScrim: "#1010127A",
    onScrim: reference.white,
    // F12 maintenance control: Product Design 5978:48721 and 1450:14015.
    successAction: "#287E63",
    onSuccessAction: reference.white,
    successSubtle: "#287E6314",
    onSuccessSubtle: "#287E63",
    warning: "#F4C66A",
    onWarning: reference.neutral900,
    // F01 Bilan uses the UI Library status/warning-subtle and icon/warning-on-surface roles.
    warningSubtle: "#FFF3D6",
    warningOnSurface: "#9A6112",
    // F01 source status: Product Design 6664:88448 and 4823:40111.
    info: "#52697A",
    onInfo: reference.white,
    errorSubtle: "#B4234014",
    // UI Library Error Toast 3326:321 layers this semantic fill over the ordinary surface.
    errorToastSubtle: "#B4234010",
    // The top confirmation layers its tint over an opaque surface and keeps 4.5:1 text contrast.
    successToastSubtle: "#287E6311",
  },
  dark: {
    canvas: "#0D0D0E",
    canvasHighlight: "#7885A5",
    canvasHighlightStart: 0.05,
    canvasTintStart: 0.01,
    canvasHighlightEnd: 0.075,
    canvasTintEnd: 0.08,
    surface: "#19191A",
    subtle: "#FFFFFF14",
    insetSurface: "#FFFFFF08",
    mediaPlaceholder: "#2B2B2D",
    logoSurface: reference.white,
    logoInk: reference.neutral900,
    rank: {
      first: "#E8CD87",
      firstContent: "#4E3911",
      second: "#C5CFDE",
      secondContent: "#283344",
      third: "#D6A17F",
      thirdContent: "#513423",
      neutral: "#242528",
    },
    performance: { won: "#76BCA6", lost: "#565A63" },
    skeleton: "#2B2B2D",
    skeletonHeader: "#121212",
    onDarkAccent: reference.white,
    onLightAccent: "#000000",
    raised: "#181819F5",
    inverse: "#F7F7F8",
    onInverse: reference.neutral900,
    contextBorderAlpha: "6B",
    sportingSurfaceAlpha: "1C",
    calendarPoolSurfaceAlpha: "0A",
    calendarPoolHeaderAlpha: "1A",
    border: "#FFFFFF2E",
    cardShadow: `${cardShadowGeometry} #00000065`,
    capsuleShadow: "0px 5px 16px #00000080",
    text: "#F7F7F8",
    accentPrimary: "#F1F1F2",
    secondaryText: "#B8B8BC",
    icon: "#F7F7F8",
    error: "#FFB3C3",
    dangerAction: "#B42340",
    onDangerAction: reference.white,
    focus: "#F7F7F8",
    overlayScrim: "#1010127A",
    onScrim: reference.white,
    // The action remains the same green; subtle feedback follows the dark semantic mode.
    successAction: "#287E63",
    onSuccessAction: reference.white,
    successSubtle: "#76BCA614",
    onSuccessSubtle: "#76BCA6",
    warning: "#F4C66A",
    onWarning: reference.neutral900,
    warningSubtle: "#4A2F08",
    warningOnSurface: "#F4C66A",
    info: "#A9BBC7",
    onInfo: reference.neutral900,
    errorSubtle: "#FFB3C314",
    errorToastSubtle: "#FFB3C314",
    successToastSubtle: "#76BCA614",
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

/** Semantic spacing roles reuse these core values rather than introducing parallel numbers. */
const spacing = {
  xs: 4,
  tight: 6,
  sm: 8,
  compact: 10,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  optical: 2,
};

/** Active Core radius values; media roles below project their existing aliases by frame size. */
const radius = {
  // UI Library Inputs / Checkbox 6476:136382 retains the compact selection corner.
  xs: 4,
  sm: 8,
  control: 12,
  lg: 16,
  media: 6,
  panelInset: 18,
  panel: 22,
  full: 999,
};

/** Platform touch/minimum: the native OS is fixed for the application's lifetime. */
const touch = { minimum: Platform.OS === "android" ? 48 : 44 };

/** Core, Typography, Motion and Platform roles. Figma slash paths become nested keys and kebab-case becomes camelCase. */
export const tokens = {
  spacing: { ...spacing, screen: spacing.lg },
  // Safe-area and keyboard measurements remain native; these are content roles only.
  layout: {
    header: 48,
    brandHeader: 69,
    width: { compact: 320 },
    content: { start: spacing.sm, end: spacing.lg },
    form: { gap: spacing.lg, labelGap: spacing.tight },
    actions: { gap: spacing.sm },
    list: { gap: spacing.md },
    section: { gap: spacing["2xl"] },
    surface: { inset: spacing.lg },
    collection: { toolbarMinHeight: touch.minimum },
    // UI Library Core layout/identity/rail-width and min-height; public card dimensions include its border.
    identity: { railWidth: 84, minHeight: 136 },
  },
  radius,
  media: {
    radius: {
      inline: radius.xs,
      compact: radius.media,
      list: radius.sm,
      tile: radius.control,
      preview: radius.lg,
      profile: radius.panelInset,
    },
    // The original identity card supplies the common artwork frame and intensity.
    halo: {
      width: 150,
      height: 168,
      compactHeight: 120,
      leadingFadeWidth: 15,
      blur: 14,
      scale: 3,
      opacity: { light: 0.34, dark: 0.42 },
    },
  },
  size: {
    brandMark: 28,
    control: { default: 48, compact: 36 },
    icon: { sm: 16, md: 20, lg: 24 },
    media: { row: 40, entity: 48, match: 32, profile: 64 },
  },
  touch,
  border: { thin: 1, subtle: 1.5 },
  opacity: { disabled: 0.45, pressed: 0.9 },
  // Native presets own their tint. The header fallback projects overlay/header-scroll from the UI Library.
  blur: {
    navigation: {
      intensity: 100,
      headerIntensity: 85,
      androidReduction: 2.8125,
      headerTint: {
        light:
          Platform.OS === "android"
            ? "default"
            : "systemUltraThinMaterialLight",
        dark: "systemUltraThinMaterialDark",
      } as const,
      headerVeil: {
        light: "rgba(255, 255, 255, 0.5)",
        dark: "rgba(17, 17, 18, 0.5)",
      },
      tint: {
        light: "systemThickMaterialLight" as const,
        dark: "systemThickMaterialDark" as const,
      },
    },
  },
  elevation: { offsetX: 0, offsetY: 4, blur: 10, cardShadowBlurRadius },
  motion: {
    compact: { duration: 220, easing: [0.2, 0.7, 0.2, 1] as const },
    // UI Library Motion 4348:25 applies the stagger only to Match sections.
    contentReveal: {
      initialTranslateY: 8,
      duration: 220,
      stagger: 60,
      easing: [0.16, 1, 0.3, 1] as const,
    },
    slow: 480,
    // UI Library Motion / Navigation 3194:109; selection remains immediate while its decoration follows.
    navigation: {
      duration: 280,
      headerRevealDistance: 240,
      iconScale: 1.04,
      iconLift: 1,
      accentEntryDuration: 330,
      accentReturnDuration: 420,
      accentReturnInkDuration: 140,
    },
  },
  sporting: {
    headerMinHeight: 72,
    teamMinHeight: 64,
    scoreSize: 40,
    calendarMatch: { teamMinHeight: 56, timeWidth: 56 },
    dateMinWidth: 120,
    statusDot: 4,
    separatorOpacity: 0.2,
    informationLabelWidth: 76,
    // Product Design Club Information 4538:32500; the basemap remains native and dynamic.
    clubMapHeight: 210,
    setLogo: 44,
    setTeamBottom: 18,
    coverSize: 574,
    coverBlur: 20,
    coverOpacity: 0.32,
    coverVeilOpacity: 0.28,
    clubTeam: { minHeight: 114, railWidth: 66, logoSize: 44 },
    // Product Design compact official standings row 4502:39958.
    standingsRowMinHeight: 68,
    standingsRankWidth: 28,
    standingsRankHeight: 32,
    standingsMarkerWidth: 3,
    standingsMarkerHeight: 40,
    standingsPointsWidth: 34,
    // Product Design Standing Card 4280:10033 / Standings Block 7758:11084.
    standingsCard: {
      firstMinHeight: 288,
      secondMinHeight: 264,
      thirdMinHeight: 240,
      rowMinHeight: 128,
      podiumRankWidth: 30,
      podiumRankHeight: 36,
      podiumIdentityMinHeight: 48,
      nameMinHeight: 40,
      tintOpacity: 0.16,
      performanceHeight: 3,
    },
  } as const,
  // Select the bundled static face explicitly so approved weights stay consistent across platforms.
  typography: {
    body: { fontFamily: "Outfit-Regular", fontSize: 14, lineHeight: 20 },
    strong: { fontFamily: "Outfit-SemiBold", fontSize: 14, lineHeight: 20 },
    title: { fontFamily: "Outfit-SemiBold", fontSize: 18, lineHeight: 24 },
    heading: { fontFamily: "Outfit-Bold", fontSize: 20, lineHeight: 26 },
    // UI Library Heading/S and Heading/L, used by the official standings composition.
    headingSm: { fontFamily: "Outfit-Bold", fontSize: 16, lineHeight: 22 },
    headingLg: {
      fontFamily: "Outfit-Bold",
      fontSize: 24,
      lineHeight: 30,
      letterSpacing: -0.12,
    },
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
    // UI Library bottom navigation 223:415 / 3305:1849; native text scaling supplies enlarged variants.
    navigationLabel: {
      fontFamily: "Outfit-Medium",
      fontSize: 11,
      lineHeight: 15,
    },
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
    // Pattern / Set Scores uses its own text-scale roles, separate from Heading/L.
    setTeam: { fontFamily: "Outfit-SemiBold", fontSize: 12, lineHeight: 15.6 },
    setLabel: { fontFamily: "Outfit-Regular", fontSize: 10, lineHeight: 13 },
    setNumber: {
      fontFamily: "Outfit-Medium",
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.2,
    },
    setScore: { fontFamily: "Outfit-Bold", fontSize: 24, lineHeight: 28.8 },
  } satisfies Record<string, TextStyle>,
};
