import React from "react";
import { StyleSheet, View } from "react-native";

import { borderWidth, radius, spacing, useAppTheme } from "@/src/shared/theme";

type AdministrationControlCardProps = {
  accentColor?: string;
  children: React.ReactNode;
  testID?: string;
};

const AdministrationControlCard = ({
  accentColor,
  children,
  testID,
}: AdministrationControlCardProps) => {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: accentColor ?? theme.border,
        },
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
};

export default AdministrationControlCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.hero,
    paddingHorizontal: spacing.inset,
    paddingVertical: spacing[4],
    borderWidth: borderWidth.subtle,
    gap: spacing[3],
  },
});
