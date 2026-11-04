import {
  StyleSheet,
  View,
  useWindowDimensions,
  type DimensionValue,
} from "react-native";
import { LoadingGroup } from "./loading-group";
import { Skeleton } from "./skeleton";
import { TextSkeleton } from "./text-skeleton";
import { tokens } from "../theme/tokens";

/** Decorative label and native field slot; the surrounding read owns its single announcement. */
export function FieldSkeleton({
  labelWidth = "35%",
  height,
}: {
  labelWidth?: DimensionValue;
  height?: number;
}) {
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

/** Three ordinary fields and one action; different forms compose FieldSkeleton for their actual anatomy. */
export function FormLoading({ label }: { label: string }) {
  return (
    <LoadingGroup label={label} style={styles.form}>
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  field: { gap: tokens.layout.form.labelGap },
  form: { gap: tokens.layout.form.gap },
});
