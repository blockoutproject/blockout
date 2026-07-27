import React from "react";
import { StyleSheet, Text, View, ViewProps } from "react-native";
import {
  elevation,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";

type FormCardProps = ViewProps & {
  title?: string;
  titleUppercase?: boolean;
};

const FormCard: React.FC<FormCardProps> = ({
  title,
  titleUppercase = true,
  style,
  children,
  ...rest
}) => {
  const theme = useAppTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface }, style]}
      {...rest}
    >
      {title ? (
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.textSecondary },
            titleUppercase && { textTransform: "uppercase" },
          ]}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
};

export default FormCard;

const styles = StyleSheet.create({
  card: {
    ...elevation.card,
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radius.hero,
    borderCurve: "continuous",
  },
  sectionTitle: {
    ...typography.label,
  },
});
