import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens } from "@/shared/theme/tokens";

// Visible title-and-athlete bounds, excluding the source images' transparent margins.
const artworkAspectRatio = 426.4913 / 365.883;
// Approved Product Design 760:8; the title retains its original vector paths.
const gradient = `<svg xmlns="http://www.w3.org/2000/svg" width="414" height="518" viewBox="0 0 414 518"><defs><linearGradient id="g" x1="-30.8" y1="32.7" x2="444.8" y2="485.3" gradientUnits="userSpaceOnUse"><stop offset=".036706" stop-color="#737373"/><stop offset=".68532" stop-color="#404040"/><stop offset=".96329" stop-color="#A3A3A3"/></linearGradient></defs><rect width="414" height="518" fill="url(#g)"/></svg>`;

/** Fits the complete decorative group to the hero remaining above the fixed account actions. */
export function SignInArtwork() {
  const [artworkWidth, setArtworkWidth] = useState(0);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.hero}
    >
      <Image
        source={{ uri: `data:image/svg+xml;base64,${btoa(gradient)}` }}
        contentFit="fill"
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View
          style={styles.space}
          onLayout={({ nativeEvent: { layout } }) =>
            setArtworkWidth(
              Math.min(layout.width, layout.height * artworkAspectRatio),
            )
          }
        >
          <View style={[styles.artwork, { width: artworkWidth }]}>
            <Image
              source={require("../../../../assets/accounts/sign-in-title.svg")}
              contentFit="contain"
              style={styles.title}
            />
            <Image
              source={require("../../../../assets/accounts/athlete-shadow.png")}
              contentFit="contain"
              style={styles.shadow}
            />
            <Image
              source={require("../../../../assets/accounts/athlete.png")}
              contentFit="contain"
              style={styles.athlete}
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
    justifyContent: "center",
  },
  artwork: { aspectRatio: artworkAspectRatio },
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
