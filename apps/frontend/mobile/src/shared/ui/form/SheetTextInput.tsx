import React from "react";
import {StyleProp, StyleSheet, TextInputProps, View, ViewStyle} from "react-native";
import {BottomSheetTextInput} from "@gorhom/bottom-sheet";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";

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
                                                         ...rest
                                                       }) => {
  const theme = useAppTheme();

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
          {borderColor: theme.border, color: theme.text},
          style,
        ]}
        placeholderTextColor={theme.textInactive}
        {...suggestionProps}
        {...rest}
      />
    </View>
  );
};

export default SheetTextInput;

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
});
