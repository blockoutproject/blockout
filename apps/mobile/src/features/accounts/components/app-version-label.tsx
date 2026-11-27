import { nativeApplicationVersion } from "expo-application";
import { useFonts } from "expo-font";
import { StyleSheet, Text, type TextProps } from "react-native";
import { tokens } from "@/shared/theme/tokens";

const handwrittenFamily = "Caveat-SemiBold";
const versionFonts = {
  [handwrittenFamily]: require("../../../../assets/fonts/Caveat-SemiBold.ttf"),
};

/** Shares the version printed on Login and Profile from the installed native app. */
export function AppVersionLabel({
  onLayout,
  style,
}: Readonly<Pick<TextProps, "onLayout" | "style">>) {
  const version = nativeApplicationVersion?.trim();
  const [handwritingLoaded] = useFonts(versionFonts);
  if (!version) {
    return null;
  }

  const fontFamily = handwritingLoaded
    ? handwrittenFamily
    : tokens.typography.metadata.fontFamily;
  return (
    <Text onLayout={onLayout} style={[styles.label, { fontFamily }, style]}>
      V{version}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 19, lineHeight: 23, textAlign: "center" },
});
