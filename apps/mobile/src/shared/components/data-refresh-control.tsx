import { RefreshControl, type RefreshControlProps } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { useExplicitRead } from "./use-explicit-read";

/** Native refresh inputs; ScrollView also injects its Android child and layout into this element. */
export type DataRefreshControlProps = Pick<
  RefreshControlProps,
  "enabled" | "children" | "style" | "progressViewOffset"
> & {
  /** Completes the explicit read; the feature retains its data, errors and recovery behavior. */
  onRefresh: () => Promise<unknown>;
  /** Actual read activity. A getter can read it before the owning observer rerenders. */
  fetching: boolean | (() => boolean);
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
  const fetchingNow = typeof fetching === "function" ? fetching() : fetching;
  const { requested, progressing, read } = useExplicitRead(
    onRefresh,
    fetchingNow,
  );

  return (
    <RefreshControl
      {...nativeContent}
      enabled={enabled}
      refreshing={progressing}
      onRefresh={!enabled || requested ? undefined : () => void read()}
      accessibilityLabel="Actualiser les données"
      accessibilityState={{ busy: progressing, disabled: !enabled }}
      colors={[context.primary]}
      tintColor={context.primary}
      progressBackgroundColor={colors.raised}
    />
  );
}
