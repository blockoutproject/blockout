import { Image } from "expo-image";
import { BlurredArtwork } from "../../../shared/components/blurred-artwork";
import { ImageFallback } from "../../../shared/components/image-fallback";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SportingIdentityResponse } from "../../../../.generated/schemas/index.zod";
import { Skeleton } from "../../../shared/components/skeleton";
import { useNativeImageLifecycle } from "../../../shared/images/use-native-image-lifecycle";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Native sports media keeps a shared skeleton until a public URI or admitted authenticated preview is displayed. */
export interface SportingMediaProps {
  identity: Pick<SportingIdentityResponse, "name" | "shortName">;
  uri?: string;
  loading?: boolean;
  error?: boolean;
  kind: "club" | "team" | "division";
  /** The owning composition sizes the slot; Media/Logo and Entity Card retain their approved shapes. */
  size?: number;
  presentation?: "logo" | "entity";
  /** The owner places both layers; a decoding failure removes the foreground and atmosphere together. */
  renderWithAtmosphere?: (logo: ReactNode, atmosphere: ReactNode) => ReactNode;
}

/** Keeps native media beneath its skeleton without remounting the caller's card; either layer's error withdraws both. */
export function SportingMedia({
  identity,
  uri,
  loading = false,
  error = false,
  kind,
  size = tokens.size.media.row,
  presentation = "logo",
  renderWithAtmosphere,
}: SportingMediaProps) {
  /** Keeps the native image, loading skeleton and absent-artwork fallback in the same media slot. */
  function renderArtwork() {
    if (available) {
      return (
        <Image
          key={image.attemptKey}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${label} : ${identity.name}`}
          accessibilityState={{ busy: pending }}
          source={{ uri }}
          cachePolicy="none"
          recyclingKey={uri}
          contentFit="contain"
          onDisplay={image.onDisplay}
          onError={image.onError}
          style={{
            width: kind === "division" ? size : size * (5 / 6),
            height: kind === "division" ? size : size * (5 / 6),
          }}
        />
      );
    }
    if (loading) {
      return <Skeleton width={size} height={size} shape="rectangle" />;
    }
    return (
      <ImageFallback
        color={colors.logoInk}
        size={
          presentation !== "logo" ? tokens.size.icon.lg : tokens.size.icon.md
        }
      />
    );
  }

  const { colors } = useTheme();
  const image = useNativeImageLifecycle(uri);
  const failed = image.status === "failed";
  const available = !!uri && !failed;
  const pending = available && image.status === "pending";
  const { notice, label } = mediaDescription(
    available,
    loading,
    error || failed,
  );
  const borderRadius =
    presentation === "entity" ? tokens.radius.media : tokens.radius.sm;
  const logo = (
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
        {renderArtwork()}
        {pending && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Skeleton width={size} height={size} shape="rectangle" />
          </View>
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
  if (!renderWithAtmosphere) {
    return logo;
  }
  const atmosphere = available ? (
    <BlurredArtwork
      key={image.attemptKey}
      testID="sporting-logo-atmosphere"
      uri={uri}
      resizeMode="contain"
      blurRadius={tokens.sporting.coverBlur}
      onError={image.onError}
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: tokens.sporting.standingsCard.atmosphereOpacity,
        },
      ]}
    />
  ) : null;
  return renderWithAtmosphere(logo, atmosphere);
}

/** Distinguishes a retained stale logo from absent, pending and failed artwork. */
function mediaDescription(
  available: boolean,
  loading: boolean,
  error: boolean,
) {
  let notice: string | undefined;
  if (error) {
    notice = available ? "Logo non actualisé" : "Logo indisponible";
  }
  if (available) {
    return { notice, label: error ? "Logo non actualisé" : "Logo" };
  }
  if (loading) {
    return { notice, label: "Chargement du logo" };
  }
  return { notice, label: error ? "Logo indisponible" : "Logo absent" };
}

/** Decorative cover inputs preserve the current source and its accepted tint without introducing fallback artwork. */
export interface SportingCoverProps {
  uri: string;
  primary: string;
}

/** Decorative cover and its tint disappear together after native decoding fails; no fallback artwork is invented. */
export function SportingCover({ uri, primary }: SportingCoverProps) {
  const [failedUri, setFailedUri] = useState<string>();
  return failedUri === uri ? null : (
    <View pointerEvents="none" accessible={false} style={styles.artwork}>
      <BlurredArtwork
        testID="sporting-decorative-cover"
        uri={uri}
        resizeMode="contain"
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
  notice: {
    ...tokens.typography.metadata,
    textAlign: "center",
    marginTop: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
    paddingBottom: tokens.spacing.xs,
  },
});
