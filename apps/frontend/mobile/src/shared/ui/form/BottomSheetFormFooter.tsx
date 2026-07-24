import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BottomSheetFooter,
  BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import React, { memo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, useAppTheme } from "@/src/shared/theme";

export type BottomSheetFormFooterProps = Omit<
  BottomSheetFooterProps,
  "children"
> & {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  backgroundColor?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  actionTestID?: string;
};

const BottomSheetFormFooter = ({
  label,
  loading = false,
  disabled = false,
  onPress,
  backgroundColor,
  icon = "content-save-outline",
  actionTestID = "bottom-sheet-form-footer-submit",
  ...footerProps
}: BottomSheetFormFooterProps) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const background = backgroundColor ?? theme.primary;
  const isDisabled = loading || disabled;

  return (
    <BottomSheetFooter {...footerProps} bottomInset={insets.bottom}>
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundSecondary,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ busy: loading, disabled: isDisabled }}
          disabled={isDisabled}
          onPress={onPress}
          style={({ pressed }) => [
            styles.submitAction,
            {
              backgroundColor: background,
              opacity: isDisabled || pressed ? 0.7 : 1,
            },
          ]}
          testID={actionTestID}
        >
          {loading ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <>
              {icon ? (
                <MaterialCommunityIcons
                  name={icon}
                  size={18}
                  color={theme.text}
                />
              ) : null}
              <Text style={[styles.submitLabel, { color: theme.text }]}>
                {label}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </BottomSheetFooter>
  );
};

export default memo(BottomSheetFormFooter);

const styles = StyleSheet.create({
  footer: {
    padding: 12,
    borderTopWidth: 1,
    justifyContent: "center",
  },
  submitAction: {
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitLabel: {
    fontWeight: "800",
    fontSize: 16,
  },
});
