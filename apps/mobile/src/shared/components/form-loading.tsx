import { StyleSheet, View, type DimensionValue } from "react-native";
import { LoadingGroup } from "./loading-group";
import { Skeleton } from "./skeleton";
import { tokens } from "../theme/tokens";

/** Decorative label and native field slot; the surrounding read owns its single announcement. */
export function FieldSkeleton({
  labelWidth = "35%",
  height = tokens.size.control.default,
}: {
  labelWidth?: DimensionValue;
  height?: number;
}) {
  return (
    <View style={styles.field}>
      <Skeleton
        width={labelWidth}
        height={tokens.typography.label.lineHeight}
      />
      <Skeleton height={height} shape="rectangle" />
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
