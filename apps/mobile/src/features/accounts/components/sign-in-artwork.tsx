import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

// Approved Product Design 4891:846. Original assets remain separate and local; no UI screenshot is used.
const gradient = `<svg xmlns="http://www.w3.org/2000/svg" width="414" height="518" viewBox="0 0 414 518"><defs><linearGradient id="g" x1="-30.8" y1="32.7" x2="444.8" y2="485.3" gradientUnits="userSpaceOnUse"><stop offset=".036706" stop-color="#737373"/><stop offset=".68532" stop-color="#404040"/><stop offset=".96329" stop-color="#A3A3A3"/></linearGradient></defs><rect width="414" height="518" fill="url(#g)"/></svg>`;

/** Responsive decorative artwork; overlap and the athlete's off-edge crop follow the approved composition. */
export function SignInArtwork() {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.artwork}
    >
      <Image
        source={{ uri: `data:image/svg+xml;base64,${btoa(gradient)}` }}
        contentFit="fill"
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={require("../../../../assets/accounts/block.svg")}
        contentFit="contain"
        style={styles.block}
      />
      <Image
        source={require("../../../../assets/accounts/out.svg")}
        contentFit="contain"
        style={styles.out}
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
  );
}
const styles = StyleSheet.create({
  artwork: { width: "100%", aspectRatio: 414 / 518, overflow: "hidden" },
  block: {
    position: "absolute",
    left: "2.17%",
    top: "17.6%",
    width: "73.19%",
    height: "13.51%",
  },
  out: {
    position: "absolute",
    left: "4.05%",
    top: "31.58%",
    width: "71.45%",
    height: "53.16%",
  },
  shadow: {
    position: "absolute",
    left: "39.70%",
    top: "11.23%",
    width: "67.06%",
    height: "80.40%",
    opacity: 0.24,
  },
  athlete: {
    position: "absolute",
    left: "41.15%",
    top: "9.52%",
    width: "67.06%",
    height: "80.40%",
  },
} as const);
