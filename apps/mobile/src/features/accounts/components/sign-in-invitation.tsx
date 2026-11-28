import { Image } from "expo-image";
import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/button";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { signInAppearance } from "./sign-in-appearance";
import { SignInBackdrop } from "./sign-in-backdrop";

// Product Design 6673:13217; the athlete may extend beyond the compact hero.
const heroHeight = 184;
const sceneAspectRatio = 343 / 176.42;

/** Shared invitation artwork and explicit account action; optional content sits between the message and action. */
export interface SignInInvitationCardProps {
  message: string;
  onSignIn(): void;
  label?: string;
  loading?: boolean;
  children?: ReactNode;
}

/** Contextual sheet only; its owner dismisses it or starts the explicit F05 connection. */
export interface SignInInvitationProps extends Omit<
  SignInInvitationCardProps,
  "children" | "label"
> {
  onClose(): void;
}

/** Gives the guest invitation natural native sheet height while retaining overflow scrolling for large text and compact windows. */
export function SignInInvitation({
  message,
  onClose,
  onSignIn,
  loading,
}: Readonly<SignInInvitationProps>) {
  return (
    <Sheet title="Connexion" onClose={onClose}>
      <SheetContent>
        <SignInInvitationCard
          message={message}
          onSignIn={onSignIn}
          loading={loading}
        />
      </SheetContent>
    </Sheet>
  );
}

/** Reserves the known invitation card while session restoration decides whether guest actions may be exposed. */
export function SignInInvitationLoading() {
  const { colors } = useTheme();
  return (
    <LoadingGroup
      label="Chargement de la connexion"
      style={[
        styles.card,
        { borderColor: colors.border, backgroundColor: colors.raised },
      ]}
    >
      <Skeleton height={heroHeight} shape="rectangle" />
      <View style={styles.content}>
        <Skeleton />
        <Skeleton width="70%" />
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      </View>
    </LoadingGroup>
  );
}

/** Renders the approved invitation without imposing a modal, navigation or session owner. */
export function SignInInvitationCard({
  message,
  onSignIn,
  label = "Se connecter",
  loading = false,
  children,
}: Readonly<SignInInvitationCardProps>) {
  const { colors, scheme } = useTheme();
  const { athlete, ink } = signInAppearance[scheme];
  return (
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
        <SignInBackdrop />
        <View style={styles.illustration}>
          <View style={styles.scene}>
            <Image
              source={require("../../../../assets/accounts/invitation-title.svg")}
              tintColor={ink}
              style={styles.title}
              contentFit="contain"
            />
            <Image
              source={athlete}
              style={styles.athlete}
              contentFit="contain"
            />
          </View>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          {message}
        </Text>
        {children}
        <Button
          label={label}
          loading={loading}
          fullWidth
          trailingIcon={ChevronRight}
          onPress={onSignIn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  hero: {
    paddingVertical: tokens.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  // The title centers vertically; the athlete keeps its independent top clearance and lower overflow.
  illustration: {
    width: "100%",
    maxWidth: (heroHeight - 2 * tokens.spacing.md) * sceneAspectRatio,
  },
  // Resolve the available width before applying the aspect ratio, including a narrower card.
  scene: {
    width: "100%",
    aspectRatio: sceneAspectRatio,
    justifyContent: "center",
  },
  title: {
    marginLeft: "4.3275%",
    width: "54.5863%",
    aspectRatio: 187.2309 / 178.6349,
  },
  athlete: {
    position: "absolute",
    left: "50.1237%",
    top: "-11%",
    width: "46.5%",
    aspectRatio: 2 / 3,
    zIndex: 1,
  },
  content: {
    padding: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
} as const);
