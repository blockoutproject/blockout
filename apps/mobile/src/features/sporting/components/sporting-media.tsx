import { Image } from "expo-image";
import { ImageFallback } from "../../../shared/components/image-fallback";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SportingIdentityResponse } from "../../../../.generated/schemas/index.zod";
import { Skeleton } from "../../../shared/components/skeleton";
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
  presentation?: "logo" | "entity" | "identity";
  /** The owner places both layers; a decoding failure removes the foreground and atmosphere together. */
  renderWithAtmosphere?: (logo: ReactNode, atmosphere: ReactNode) => ReactNode;
}

/** The source identity survives status changes and rejects queued events from a replaced native image. */
interface NativeLogoState {
  source: { uri?: string };
  status: "pending" | "displayed" | "failed";
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
  const { colors } = useTheme();
  const [image, setImage] = useState<NativeLogoState>(() => ({
    source: { uri },
    status: "pending",
  }));
  // Reset only image state before rendering a changed URI, preserving caller-owned card content.
  if (image.source.uri !== uri)
    setImage({ source: { uri }, status: "pending" });
  const source = image.source;
  /** Only this native source may settle; an error remains terminal even after a queued display event. */
  function settleImage(status: "displayed" | "failed") {
    setImage((current) =>
      current.source !== source || current.status === "failed"
        ? current
        : { ...current, status },
    );
  }
  const failed = image.status === "failed";
  const available = !!uri && !failed;
  const pending = available && image.status === "pending";
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
    presentation === "identity"
      ? tokens.radius.panelInset
      : presentation === "entity"
        ? tokens.radius.media
        : tokens.radius.sm;
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
        {available ? (
          <Image
            key={uri}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${label} : ${identity.name}`}
            accessibilityState={{ busy: pending }}
            source={{ uri }}
            cachePolicy="none"
            recyclingKey={uri}
            contentFit="contain"
            onDisplay={() => settleImage("displayed")}
            onError={() => settleImage("failed")}
            style={{
              width:
                kind === "division" || presentation === "identity"
                  ? size
                  : size * (5 / 6),
              height:
                kind === "division" || presentation === "identity"
                  ? size
                  : size * (5 / 6),
            }}
          />
        ) : loading ? (
          <Skeleton width={size} height={size} shape="rectangle" />
        ) : (
          <ImageFallback
            color={colors.logoInk}
            size={
              presentation !== "logo"
                ? tokens.size.icon.lg
                : tokens.size.icon.md
            }
          />
        )}
        {pending && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Skeleton width={size} height={size} shape="rectangle" />
          </View>
        )}
      </View>
      {notice && presentation !== "identity" && (
        <Text
          accessible={false}
          style={[styles.notice, { color: colors.logoInk }]}
        >
          {notice}
        </Text>
      )}
    </View>
  );
  return renderWithAtmosphere
    ? renderWithAtmosphere(
        logo,
        available ? (
          <Image
            key={uri}
            accessible={false}
            testID="sporting-logo-atmosphere"
            pointerEvents="none"
            source={{ uri }}
            cachePolicy="none"
            recyclingKey={uri}
            contentFit={presentation === "identity" ? "cover" : "contain"}
            blurRadius={
              presentation === "identity"
                ? tokens.media.identityAtmosphere.blur
                : tokens.sporting.coverBlur
            }
            onError={() => settleImage("failed")}
            style={[
              StyleSheet.absoluteFill,
              {
                opacity:
                  presentation === "identity"
                    ? tokens.media.identityAtmosphere.opacity
                    : tokens.sporting.standingsCard.atmosphereOpacity,
              },
            ]}
          />
        ) : null,
      )
    : logo;
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
        recyclingKey={uri}
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
  notice: {
    ...tokens.typography.metadata,
    textAlign: "center",
    marginTop: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
    paddingBottom: tokens.spacing.xs,
  },
});
