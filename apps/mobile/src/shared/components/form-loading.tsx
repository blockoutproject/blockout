import {
  StyleSheet,
  View,
  useWindowDimensions,
  type DimensionValue,
} from "react-native";
import { Skeleton } from "./skeleton";
import { TextSkeleton } from "./text-skeleton";
import { tokens } from "@/shared/theme/tokens";

/** Decorative label and native field slot; the surrounding read owns its single announcement. */
export function FieldSkeleton({
  labelWidth = "35%",
  height,
}: Readonly<{
  labelWidth?: DimensionValue;
  height?: number;
}>) {
  const { fontScale } = useWindowDimensions();
  const fieldHeight =
    height ??
    Math.max(
      tokens.size.control.default,
      tokens.typography.body.lineHeight * fontScale +
        2 * (tokens.spacing.md + tokens.border.thin),
    );
  return (
    <View style={styles.field}>
      <TextSkeleton width={labelWidth} role="label" />
      <Skeleton height={fieldHeight} shape="rectangle" />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: tokens.layout.form.labelGap },
});
