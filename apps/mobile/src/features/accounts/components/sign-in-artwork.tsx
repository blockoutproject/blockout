import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { AppVersionLabel } from "./app-version-label";

// Visible title-and-athlete bounds, excluding the source images' transparent margins.
const artworkAspectRatio = 426.4913 / 365.883;

/** Centers the artwork and places the installed version in the gap below it. */
export function SignInArtwork() {
  const { colors } = useTheme();
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const [versionHeight, setVersionHeight] = useState(0);
  // Equal gaps keep the artwork centered even when enlarged text needs more room.
  const gap = versionHeight > 0 ? versionHeight + tokens.spacing.sm : 0;
  const artworkWidth = Math.min(
    space.width,
    Math.max(0, space.height - 2 * gap) * artworkAspectRatio,
  );

  return (
    <View style={styles.hero}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View
          style={styles.space}
          onLayout={({ nativeEvent: { layout } }) =>
            setSpace({ width: layout.width, height: layout.height })
          }
        >
          <View style={styles.gap} />
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.artwork, { width: artworkWidth }]}
          >
            <Image
              source={require("../../../../assets/accounts/sign-in-title.svg")}
              contentFit="contain"
              style={styles.title}
            />
            <Image
              source={require("../../../../assets/accounts/athlete-shadow.png")}
              contentFit="contain"
              tintColor="#000000"
              blurRadius={8}
              style={styles.shadow}
            />
            <Image
              source={require("../../../../assets/accounts/athlete.png")}
              contentFit="contain"
              style={styles.athlete}
            />
          </View>
          <View style={styles.gap}>
            <AppVersionLabel
              onLayout={({ nativeEvent: { layout } }) =>
                setVersionHeight(layout.height)
              }
              style={[styles.version, { color: colors.onDarkAccent }]}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, minHeight: 0, overflow: "hidden" },
  safeArea: { flex: 1 },
  space: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: tokens.spacing.lg,
    alignItems: "center",
  },
  gap: { flex: 1, alignSelf: "stretch", justifyContent: "center" },
  artwork: { aspectRatio: artworkAspectRatio },
  version: { opacity: 0.78 },
  title: {
    position: "absolute",
    left: 0,
    top: "3.2842%",
    width: "70.895%",
    height: "96.7158%",
  },
  shadow: {
    position: "absolute",
    left: "36.4208%",
    top: "-5.6619%",
    width: "65.0959%",
    height: "113.682%",
    opacity: 0.24,
  },
  athlete: {
    position: "absolute",
    left: "37.8283%",
    top: "-8.1511%",
    width: "65.0959%",
    height: "113.8185%",
  },
} as const);
