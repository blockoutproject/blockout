import React from "react";
import { StyleSheet, View } from "react-native";

import { useAppTheme } from "@/src/shared/theme";

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
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    gap: 12,
  },
});
