import { colors } from "@/src/shared/theme/tokens";

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
  background: colors.background.default,
  backgroundSecondary: colors.background.secondary,
  surface: colors.surface.default,
  surfaceSecondary: colors.surface.secondary,
  surfaceTertiary: colors.surface.tertiary,
  border: colors.border.default,
  borderSecondary: colors.border.strong,
  text: colors.text.primary,
  textSecondary: colors.text.secondary,
  textInactive: colors.text.inactive,
  muted: colors.overlay.muted,
  onPrimary: colors.text.onPrimary,
  hover: colors.interaction.hover,
  pressed: colors.interaction.pressed,
  primary: colors.status.primary,
  success: colors.status.success,
  error: colors.status.error,
  warning: colors.status.warning,
  gold: colors.premium.gold,
  silver: colors.ranking.silver,
  bronze: colors.ranking.bronze,
  male: colors.gender.male,
  female: colors.gender.female,
};
