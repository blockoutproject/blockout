import { Controller, type Control } from "react-hook-form";
import { Pressable, StyleSheet, Text } from "react-native";
import { TextField } from "@/shared/components/text-field";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import type { ContributionValues } from "../schemas/contribution-schema";

export function ContributionUrlField({
  control,
  editable,
}: Readonly<{ control: Control<ContributionValues>; editable: boolean }>) {
  return (
    <Controller
      control={control}
      name="url"
      render={({ field, fieldState }) => (
        <TextField
          ref={field.ref}
          label="Adresse du lien"
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={editable}
          error={fieldState.error?.message}
          helper="YouTube, Twitch ou Facebook"
        />
      )}
    />
  );
}

export function ContributionWithdrawalButton({
  disabled,
  onPress,
}: Readonly<{ disabled: boolean; onPress: () => void }>) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retirer"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.withdraw}
    >
      <Text
        style={[
          tokens.typography.body,
          { color: colors.error, textDecorationLine: "underline" },
        ]}
      >
        Retirer
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  withdraw: {
    minHeight: tokens.touch.minimum,
    minWidth: tokens.touch.minimum,
    justifyContent: "center",
    alignItems: "center",
  },
});
