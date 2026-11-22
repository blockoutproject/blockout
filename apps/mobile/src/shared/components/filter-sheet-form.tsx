import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { Button } from "./button";
import { Skeleton } from "./skeleton";

/** The filter form keeps the same control spacing and actions while each feature owns its draft. */
export function FilterSheetForm({
  children,
  onApply,
  onReset,
}: Readonly<PropsWithChildren<{ onApply: () => void; onReset: () => void }>>) {
  return (
    <View style={styles.form}>
      {children}
      <View style={styles.actions}>
        <Button label="Appliquer les filtres" fullWidth onPress={onApply} />
        <Button
          label="Réinitialiser les filtres"
          fullWidth
          variant="secondary"
          onPress={onReset}
        />
      </View>
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
  form: { gap: tokens.layout.form.gap },
  actions: { gap: tokens.layout.actions.gap },
});
