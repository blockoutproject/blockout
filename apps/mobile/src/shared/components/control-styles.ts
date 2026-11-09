import { tokens } from "../theme/tokens";
import type { Theme } from "../theme/theme-provider";

/** Disabled paint takes precedence over press feedback for shared native controls. */
export function controlOpacity(
  disabled: boolean | undefined,
  pressed: boolean,
): number {
  if (disabled) {
    return tokens.opacity.disabled;
  }
  return pressed ? tokens.opacity.pressed : 1;
}

/** Validation errors take precedence over the focused border on editable text controls. */
export function fieldBorderColor(
  colors: Theme["colors"],
  error: string | undefined,
  focused: boolean,
): string {
  if (error) {
    return colors.error;
  }
  return focused ? colors.focus : colors.border;
}
