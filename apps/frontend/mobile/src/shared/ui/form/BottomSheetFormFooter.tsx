import React, {memo} from "react";
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {BottomSheetFooter, BottomSheetFooterProps} from "@gorhom/bottom-sheet";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {CORNERS} from "@/src/shared/theme/tokens";

export type BottomSheetFormFooterProps = Omit<BottomSheetFooterProps, "children"> & {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  backgroundColor?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
};

const BottomSheetFormFooter: React.FC<BottomSheetFormFooterProps> = ({
                                                                       label,
                                                                       loading,
                                                                       disabled,
                                                                       onPress,
                                                                       backgroundColor,
                                                                       icon = "content-save-outline",
                                                                       ...footerProps
                                                                     }) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const bg = backgroundColor ?? theme.primary;

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
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {backgroundColor: bg, opacity: loading || disabled ? 0.7 : 1},
          ]}
          disabled={loading || disabled}
          onPress={onPress}
          activeOpacity={0.85}
          testID="bottom-sheet-form-footer-submit"
        >
          {loading ? (
            <ActivityIndicator color={theme.text}/>
          ) : (
            <>
              {!!icon && (
                <MaterialCommunityIcons
                  name={icon as any}
                  size={18}
                  color={theme.text}
                />
              )}
              <Text style={[styles.submitText, {color: theme.text}]}>
                {label}
              </Text>
            </>
          )}
        </TouchableOpacity>
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
  submitBtn: {
    borderRadius: CORNERS,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitText: {
    fontWeight: "800",
    fontSize: 16,
  },
});
