import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import React from "react";
import {StyleSheet, Text, View} from "react-native";

const Field: React.FC<{ label?: string; children: React.ReactNode; error?: string; touched?: boolean }> = ({
                                                                                                             label,
                                                                                                             children,
                                                                                                             error,
                                                                                                             touched,
                                                                                                           }) => {
  const theme = useAppTheme();
  return (
    <View style={styles.fieldBlock}>
      {label && <Text style={[styles.label, {color: theme.text}]}>{label}</Text>}
      {children}
      {touched && error ? <Text style={[styles.error, {color: theme.error}]}>{error}</Text> : null}
    </View>
  );
};

export default Field;

const styles = StyleSheet.create({
  fieldBlock: {marginBottom: 6},
  error: {fontSize: 12, marginTop: 4, marginLeft: 8, fontWeight: "600"},
  label: {fontSize: 14, fontWeight: "600", marginBottom: 6, marginLeft: 4}
});
