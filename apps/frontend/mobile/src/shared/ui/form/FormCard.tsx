import React from "react";
import { StyleSheet, Text, View, ViewProps } from "react-native";
import { useAppTheme } from "@/src/shared/theme";

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
      style={[
        styles.card,
        { backgroundColor: theme.surface, shadowColor: "#000" },
        style,
      ]}
      {...rest}
    >
      {title ? (
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
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
    borderRadius: 18,
    padding: 14,
    gap: 12,
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.85,
  },
});
