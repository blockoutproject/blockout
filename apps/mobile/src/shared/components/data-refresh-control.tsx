import { RefreshControl, type RefreshControlProps } from "react-native";
import { useState } from "react";
import { useTheme } from "../theme/theme-provider";

/** Native refresh inputs; ScrollView also injects its Android child and layout into this element. */
export type DataRefreshControlProps = Pick<
  RefreshControlProps,
  "enabled" | "children" | "style" | "progressViewOffset"
> & {
  /** Completes the explicit read; the feature retains its data, errors and recovery behavior. */
  onRefresh: () => Promise<unknown>;
  /** Actual native Query fetch activity; a suspended gesture keeps its promise without progress. */
  fetching?: boolean;
};

/**
 * Shows native progress only for the pull gesture, independently of automatic reads.
 * Keeps the native scroll hierarchy intact while a conflicting command disables the gesture.
 * Android disables its gesture through enabled; iOS retains RN's controlled non-refreshing reset.
 */
export function DataRefreshControl({
  onRefresh,
  enabled = true,
  fetching,
  ...nativeContent
}: Readonly<DataRefreshControlProps>) {
  const { colors, context } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const progressing = refreshing && (fetching ?? true);

  /** The callback's promise bounds this gesture; read failures remain with the feature owner. */
  async function refresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <RefreshControl
      {...nativeContent}
      enabled={enabled}
      refreshing={progressing}
      onRefresh={!enabled || refreshing ? undefined : () => void refresh()}
      accessibilityLabel="Actualiser les données"
      accessibilityState={{ busy: progressing, disabled: !enabled }}
      colors={[context.primary]}
      tintColor={context.primary}
      progressBackgroundColor={colors.raised}
    />
  );
}
