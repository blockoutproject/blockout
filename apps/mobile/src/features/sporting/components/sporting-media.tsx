import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SportingIdentityResponse } from "../../../../.generated/schemas/index.zod";
import { LoadingIndicator } from "../../../shared/components/loading-indicator";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Shared native sports media; query owners supply admitted bytes and their current loading/error state. */
export interface SportingMediaProps {
  identity: Pick<SportingIdentityResponse, "name" | "shortName">;
  uri?: string;
  loading?: boolean;
  error?: boolean;
  kind: "club" | "team" | "division";
  /** The owning composition sizes the slot; Media/Logo and Entity Card retain their approved shapes. */
  size?: number;
  presentation?: "logo" | "entity";
}

/** White logo plate in both themes, with supplied monograms only and one accessible native image state. */
export function SportingMedia({
  identity,
  uri,
  loading = false,
  error = false,
  kind,
  size = tokens.size.media.row,
  presentation = "logo",
}: SportingMediaProps) {
  const { colors } = useTheme();
  const [failedUri, setFailedUri] = useState<string>();
  const failed = !!uri && failedUri === uri;
  const available = !!uri && !failed;
  const missing = !available && !loading && !error && !failed;
  const notice =
    error || failed
      ? available
        ? "Logo non actualisé"
        : "Logo indisponible"
      : undefined;
  const label = available
    ? error
      ? "Logo non actualisé"
      : "Logo"
    : loading
      ? "Chargement du logo"
      : error || failed
        ? "Logo indisponible"
        : "Logo absent";
  const borderRadius =
    presentation === "entity" ? tokens.radius.media : tokens.radius.sm;
  return (
    <View
      style={[
        styles.media,
        notice ? { minWidth: size } : { width: size },
        { borderRadius, backgroundColor: colors.logoSurface },
      ]}
    >
      <View
        accessible={!available}
        accessibilityRole={available ? undefined : "image"}
        accessibilityLabel={
          available ? undefined : `${label} : ${identity.name}`
        }
        accessibilityState={{ busy: loading && !available }}
        style={[
          styles.slot,
          {
            width: size,
            height: size,
            backgroundColor: colors.logoSurface,
            borderRadius,
          },
        ]}
      >
        {available ? (
          <Image
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${label} : ${identity.name}`}
            source={{ uri }}
            cachePolicy="none"
            contentFit="contain"
            onError={() => setFailedUri(uri)}
            style={{
              width: kind === "division" ? size : size * (5 / 6),
              height: kind === "division" ? size : size * (5 / 6),
            }}
          />
        ) : loading ? (
          <LoadingIndicator color={colors.logoInk} />
        ) : missing && identity.shortName ? (
          <Text
            // The supplied monogram is artwork in a fixed logo slot; the adjacent identity and notice still scale.
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.monogram, { color: colors.logoInk }]}
          >
            {identity.shortName}
          </Text>
        ) : (
          <ImageOff
            accessible={false}
            color={colors.logoInk}
            size={
              presentation === "entity"
                ? tokens.size.icon.lg
                : tokens.size.icon.md
            }
          />
        )}
      </View>
      {notice && (
        <Text
          accessible={false}
          style={[styles.notice, { color: colors.logoInk }]}
        >
          {notice}
        </Text>
      )}
    </View>
  );
}

/** Decorative cover and its tint disappear together after native decoding fails; no fallback artwork is invented. */
export function SportingCover({
  uri,
  primary,
}: {
  uri: string;
  primary: string;
}) {
  const [failedUri, setFailedUri] = useState<string>();
  return failedUri === uri ? null : (
    <View pointerEvents="none" accessible={false} style={styles.artwork}>
      <Image
        accessible={false}
        testID="sporting-decorative-cover"
        source={{ uri }}
        cachePolicy="none"
        contentFit="contain"
        blurRadius={tokens.sporting.coverBlur}
        onError={() => setFailedUri(uri)}
        style={styles.cover}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: primary,
            opacity: tokens.sporting.coverVeilOpacity,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cover: {
    width: tokens.sporting.coverSize,
    aspectRatio: 1,
    opacity: tokens.sporting.coverOpacity,
  },
  media: {
    alignItems: "center",
    flexShrink: 1,
    maxWidth: "100%",
    overflow: "hidden",
  },
  slot: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  monogram: tokens.typography.strong,
  notice: {
    ...tokens.typography.metadata,
    textAlign: "center",
    marginTop: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
    paddingBottom: tokens.spacing.xs,
  },
});
