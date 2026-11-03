import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "../../../shared/theme/tokens";

/** One existing native-grid calculation serves accepted calendars and pre-admission calendar placeholders. */
export function useCalendarLayout(listWidth = 0) {
  const { fontScale, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stacked = fontScale >= 1.6;
  const availableWidth =
    (listWidth || width - insets.left - insets.right) -
    2 * tokens.spacing.screen;
  // Every lateral grid column retains the scaled 40-point date rail before its optical gap.
  const columns = stacked
    ? 1
    : Math.max(2, Math.min(8, Math.floor(availableWidth / (40 * fontScale))));
  return { columns, stacked };
}
