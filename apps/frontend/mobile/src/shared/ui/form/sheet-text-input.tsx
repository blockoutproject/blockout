import React, { useState } from "react";
import {
  StyleProp,
  StyleSheet,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import {
  borderWidth,
  radius,
  spacing,
  stateOpacity,
  typography,
  useAppTheme,
} from "@/src/shared/theme";

/**
 * Input générique pour BottomSheet qui:
 *  - désactive par défaut: autocorrect, spellcheck, suggestions, autofill, textContentType.
 *  - garde la possibilité de réactiver via `enableSuggestions`.
 */
export type SheetTextInputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  enableSuggestions?: boolean;
};

const SheetTextInput: React.FC<SheetTextInputProps> = ({
  containerStyle,
  style,
  enableSuggestions = false,
  editable = true,
  onBlur,
  onFocus,
  ...rest
}) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);

  const suggestionProps: TextInputProps = enableSuggestions
    ? {}
    : {
        autoCorrect: false,
        spellCheck: false,
        autoCapitalize: "none",
        autoComplete: "off",
        textContentType: "none",
        importantForAutofill: "no",
      };

  return (
    <View style={containerStyle}>
      <BottomSheetTextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: focused ? theme.primary : theme.border,
            borderWidth: focused ? borderWidth.medium : borderWidth.thin,
            color: theme.text,
            opacity: editable ? 1 : stateOpacity.disabled,
          },
          style,
        ]}
        placeholderTextColor={theme.textInactive}
        editable={editable}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        {...suggestionProps}
        {...rest}
      />
    </View>
  );
};

export default SheetTextInput;

const styles = StyleSheet.create({
  input: {
    ...typography.body,
    minHeight: spacing[12],
    borderRadius: radius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
  },
});
