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

// Product Design 8299:3022 / 8299:3096; the athlete may extend beyond the compact hero.
const heroHeight = 184;
const sceneAspectRatio = 343 / 176.42;
const gradient = `<svg xmlns="http://www.w3.org/2000/svg" width="343" height="210.373" viewBox="0 0 343 210.373"><defs><linearGradient id="g" x1="27.5944" y1="0" x2="173.459" y2="283.426" gradientUnits="userSpaceOnUse"><stop stop-color="#404040"/><stop offset=".7" stop-color="#171717"/><stop offset="1" stop-color="#737373"/></linearGradient></defs><rect width="343" height="210.373" fill="url(#g)"/></svg>`;

/** Shared invitation artwork and explicit account action; optional content sits between the message and action. */
export interface SignInInvitationCardProps {
  message: string;
  onSignIn(): void;
  label?: string;
  loading?: boolean;
  children?: ReactNode;
}

/** Contextual sheet only; callers dismiss or navigate to F05 sign-in without replaying an action. */
export interface SignInInvitationProps extends Omit<
  SignInInvitationCardProps,
  "children" | "label" | "loading"
> {
  onClose(): void;
}

/** Gives the guest invitation natural native sheet height while retaining overflow scrolling for large text and compact windows. */
export function SignInInvitation({
  message,
  onClose,
  onSignIn,
}: Readonly<SignInInvitationProps>) {
  return (
    <Sheet title="Connexion" onClose={onClose}>
      <SheetContent>
        <SignInInvitationCard message={message} onSignIn={onSignIn} />
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
  const { colors } = useTheme();
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
        <Image
          source={{ uri: `data:image/svg+xml;base64,${btoa(gradient)}` }}
          style={StyleSheet.absoluteFill}
          contentFit="fill"
        />
        <View style={styles.illustration}>
          <View style={styles.scene}>
            <Image
              source={require("../../../../assets/accounts/invitation-title.svg")}
              style={styles.title}
              contentFit="contain"
            />
            <Image
              source={require("../../../../assets/accounts/athlete.png")}
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
