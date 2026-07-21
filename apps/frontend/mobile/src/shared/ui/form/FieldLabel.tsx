import React from "react";
import {StyleSheet, Text} from "react-native";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({children}) => {
  const theme = useAppTheme();
  return <Text style={[styles.lbl, {color: theme.text}]}>{children}</Text>;
};

export default FieldLabel;

const styles = StyleSheet.create({
  lbl: {fontSize: 13, fontWeight: "800"},
});
