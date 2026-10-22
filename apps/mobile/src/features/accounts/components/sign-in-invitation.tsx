import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../shared/components/button";
import { Sheet } from "../../../shared/components/sheet";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

// Artwork from Product Design 5263:6373 / 5263:6555, uniformly reduced inside the compact native banner.
const gradient = `<svg xmlns="http://www.w3.org/2000/svg" width="343" height="210.373" viewBox="0 0 343 210.373"><defs><linearGradient id="g" x1="27.5944" y1="0" x2="173.459" y2="283.426" gradientUnits="userSpaceOnUse"><stop stop-color="#404040"/><stop offset=".7" stop-color="#171717"/><stop offset="1" stop-color="#737373"/></linearGradient></defs><rect width="343" height="210.373" fill="url(#g)"/></svg>`;

/** Contextual invitation only; callers close it or navigate to ordinary F05 sign-in without replaying an action. */
export interface SignInInvitationProps {
  message: string;
  onClose(): void;
  onSignIn(): void;
}

/** Fits the compact guest invitation and its ordinary sign-in action in a native sheet without scrolling. */
export function SignInInvitation({
  message,
  onClose,
  onSignIn,
}: SignInInvitationProps) {
  const { colors } = useTheme();
  return (
    <Sheet title="Connexion" onClose={onClose} scrollable={false}>
      <View
        style={[
          styles.card,
          { borderColor: colors.border, backgroundColor: colors.raised },
        ]}
      >
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.artwork}
        >
          <Image
            source={{ uri: `data:image/svg+xml;base64,${btoa(gradient)}` }}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
          />
          <View style={styles.illustration}>
            <Image
              source={require("../../../../assets/accounts/invitation-block.svg")}
              style={styles.block}
              contentFit="contain"
            />
            <Image
              source={require("../../../../assets/accounts/invitation-out.svg")}
              style={styles.out}
              contentFit="contain"
            />
            <Image
              source={require("../../../../assets/accounts/athlete.png")}
              style={styles.athlete}
              contentFit="cover"
            />
          </View>
        </View>
        <View style={styles.content}>
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            {message}
          </Text>
          <Button label="Se connecter" fullWidth onPress={onSignIn} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    overflow: "hidden",
  },
  artwork: {
    height: 128,
    alignItems: "center",
    paddingTop: tokens.spacing.sm,
    overflow: "hidden",
  },
  illustration: { width: 160, aspectRatio: 343 / 210.373 },
  block: {
    position: "absolute",
    left: "5.45%",
    top: "9.07%",
    width: "54.81%",
    height: "20.44%",
  },
  out: {
    position: "absolute",
    left: "6%",
    top: "30.98%",
    width: "53.68%",
    height: "61.95%",
  },
  athlete: {
    position: "absolute",
    left: "50%",
    top: "-4.89%",
    width: "49%",
    height: "119.84%",
    zIndex: 1,
  },
  content: { padding: tokens.spacing.md, gap: tokens.spacing.sm },
});
