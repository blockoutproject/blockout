import { RefreshControl, type RefreshControlProps } from "react-native";
import { useTheme } from "../theme/theme-provider";

/** Native refresh inputs; ScrollView also injects its Android child and layout into this element. */
export type DataRefreshControlProps = Pick<
  RefreshControlProps,
  "refreshing" | "onRefresh" | "enabled" | "children" | "style"
>;

/**
 * Applies shared progress semantics without changing the native scroll hierarchy while a command runs.
 * Android disables its gesture through enabled; iOS retains RN's controlled non-refreshing reset.
 */
export function DataRefreshControl({
  refreshing,
  onRefresh,
  enabled = true,
  ...nativeContent
}: DataRefreshControlProps) {
  const { colors, context } = useTheme();
  return (
    <RefreshControl
      {...nativeContent}
      enabled={enabled}
      refreshing={refreshing}
      onRefresh={!enabled || refreshing ? undefined : onRefresh}
      accessibilityLabel="Actualiser les données"
      accessibilityState={{ busy: refreshing, disabled: !enabled }}
      colors={[context.primary]}
      tintColor={context.primary}
      progressBackgroundColor={colors.raised}
    />
  );
}
