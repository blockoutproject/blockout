import { Image } from "expo-image";
import { ChevronRight } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../shared/components/button";
import { Sheet } from "../../../shared/components/sheet";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

// Product Design 5263:6373 / 5263:6555; the lettering's visible bounds define the compact hero frame.
const heroHeight = 184;
const letteringAspectRatio = 343 / 176.42;
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
          style={styles.hero}
        >
          <Image
            source={{ uri: `data:image/svg+xml;base64,${btoa(gradient)}` }}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
          />
          <View style={styles.illustration}>
            <View style={styles.scene}>
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
        </View>
        <View style={styles.content}>
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            {message}
          </Text>
          <Button
            label="Se connecter"
            fullWidth
            trailingIcon={ChevronRight}
            onPress={onSignIn}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  hero: {
    height: heroHeight,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  // Keep equal lettering margins; narrow cards scale the whole scene without changing its proportions.
  illustration: {
    width: "100%",
    maxWidth: (heroHeight - 2 * tokens.spacing.md) * letteringAspectRatio,
  },
  // Resolve the available width before applying the aspect ratio, including a narrower card.
  scene: { width: "100%", aspectRatio: letteringAspectRatio },
  block: {
    position: "absolute",
    left: "5.45%",
    top: 0,
    width: "54.81%",
    height: "24.37%",
  },
  out: {
    position: "absolute",
    left: "6%",
    top: "26.13%",
    width: "53.68%",
    height: "73.87%",
  },
  athlete: {
    position: "absolute",
    left: "50%",
    top: "-16.65%",
    width: "49%",
    height: "142.90%",
    zIndex: 1,
  },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.md },
} as const);
