import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BottomSheetFooter,
  BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  iconSize,
  borderWidth,
  spacing,
  useAppTheme,
} from "@/src/shared/theme";
import {
  Action,
  type ActionProps,
  type ActionVariant,
} from "@/src/shared/ui/action";

export type BottomSheetFormFooterProps = Omit<
  BottomSheetFooterProps,
  "children"
> & {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => Promise<void> | void;
  variant?: ActionVariant;
  gradient?: ActionProps["gradient"];
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  actionTestID?: string;
};

const BottomSheetFormFooter = ({
  label,
  loading = false,
  disabled = false,
  onPress,
  variant = "primary",
  gradient,
  icon = "content-save-outline",
  actionTestID = "bottom-sheet-form-footer-submit",
  ...footerProps
}: BottomSheetFormFooterProps) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const foreground =
    variant === "primary"
      ? theme.onPrimary
      : variant === "destructiveOutline"
        ? theme.error
        : theme.text;

  return (
    <BottomSheetFooter {...footerProps} bottomInset={insets.bottom}>
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Action
          label={label}
          variant={variant}
          gradient={gradient}
          fullWidth
          loading={loading}
          loadingLabel={label}
          disabled={disabled}
          onPress={onPress}
          leftIcon={
            icon ? (
              <MaterialCommunityIcons
                name={icon}
                size={iconSize.control}
                color={foreground}
              />
            ) : undefined
          }
          testID={actionTestID}
        />
      </View>
    </BottomSheetFooter>
  );
};

export default memo(BottomSheetFormFooter);

const styles = StyleSheet.create({
  footer: {
    padding: spacing[3],
    borderTopWidth: borderWidth.thin,
    justifyContent: "center",
  },
});
