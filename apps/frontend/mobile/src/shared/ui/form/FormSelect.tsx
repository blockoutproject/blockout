import React from "react";
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";

export type FormSelectProps = {
  label: string;
  valueLabel?: string | null;
  placeholder?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

const FormSelect: React.FC<FormSelectProps> = ({
                                                 label,
                                                 valueLabel,
                                                 placeholder = "Sélectionner…",
                                                 onPress,
                                                 loading = false,
                                                 disabled = false,
                                               }) => {
  const theme = useAppTheme();
  const isEmpty = !valueLabel || valueLabel.length === 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.container,
        {
          borderColor: theme.border,
          backgroundColor: theme.backgroundSecondary,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.fieldLabel, {color: theme.textInactive}]}>{label}</Text>

      <View style={styles.valueRow}>
        <Text
          numberOfLines={1}
          style={[
            styles.valueText,
            {color: isEmpty ? theme.textInactive : theme.text},
          ]}
        >
          {isEmpty ? placeholder : valueLabel}
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={theme.textInactive}/>
        ) : (
          <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.textInactive}/>
        )}
      </View>
    </Pressable>
  );
};

export default FormSelect;

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  valueText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
});
