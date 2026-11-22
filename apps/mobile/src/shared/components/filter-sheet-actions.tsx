import { StyleSheet, View } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { Button } from "./button";
import { Skeleton } from "./skeleton";

export function FilterSheetActions({
  onApply,
  onReset,
}: Readonly<{
  onApply: () => void;
  onReset: () => void;
}>) {
  return (
    <View style={styles.actions}>
      <Button label="Appliquer les filtres" fullWidth onPress={onApply} />
      <Button
        label="Réinitialiser les filtres"
        fullWidth
        variant="secondary"
        onPress={onReset}
      />
    </View>
  );
}

export function FilterSheetActionsSkeleton() {
  return (
    <View style={styles.actions}>
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: tokens.layout.actions.gap },
});
