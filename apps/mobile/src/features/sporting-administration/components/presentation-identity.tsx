import { RoundedContainedImage } from "@/shared/components/rounded-contained-image";
import { StyleSheet, Text, View } from "react-native";
import { ImageFallback } from "@/shared/components/image-fallback";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useNativeImageLifecycle } from "@/shared/images/use-native-image-lifecycle";

/** The retained draft preview uses current artwork, editable division colors and optional public season context. */
export interface PresentationIdentityProps {
  uri?: string | null;
  loading: boolean;
  isDivision: boolean;
  name: string;
  title: string;
  seasonLabel?: string;
  color: string;
  gradient: readonly string[];
}

/** Keeps the form's context logo slot through missing/failed native artwork without changing selection or editable state. */
export function PresentationIdentity({
  uri,
  loading,
  isDivision,
  name,
  title,
  seasonLabel,
  color,
  gradient,
}: Readonly<PresentationIdentityProps>) {
  const { colors } = useTheme();
  const nativeImage = useNativeImageLifecycle(uri ?? undefined);
  const available = !!uri && nativeImage.status !== "failed";
  const identityName = isDivision ? name.trim() || "Nouvelle division" : title;
  const placeholderStyle = isDivision
    ? styles.divisionPlaceholder
    : styles.contextLogo;
  const skeletonSize = isDivision ? 38 : 64;
  return (
    <>
      {available ? (
        <RoundedContainedImage
          key={nativeImage.attemptKey}
          source={{ uri }}
          cachePolicy="none"
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Logo : ${identityName}`}
          style={isDivision ? styles.divisionLogo : styles.contextLogo}
          onDisplay={nativeImage.onDisplay}
          onError={nativeImage.onError}
        />
      ) : loading ? (
        <LoadingGroup label="Chargement du logo" style={placeholderStyle}>
          <Skeleton
            width={skeletonSize}
            height={skeletonSize}
            shape="rectangle"
            radius={
              isDivision
                ? tokens.media.radius.tile
                : tokens.media.radius.preview
            }
          />
        </LoadingGroup>
      ) : (
        <View
          style={[
            placeholderStyle,
            styles.imagePlaceholder,
            { backgroundColor: colors.mediaPlaceholder },
          ]}
        >
          <ImageFallback
            size={tokens.size.icon.lg}
            color={colors.icon}
            label={`${uri ? "Logo indisponible" : "Logo absent"} : ${identityName}`}
          />
        </View>
      )}
      <View style={styles.contextName}>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          {identityName}
        </Text>
        {(isDivision || seasonLabel) && (
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            {isDivision ? "Aperçu" : seasonLabel}
          </Text>
        )}
      </View>
      {isDivision && (
        <View style={styles.palette}>
          {(gradient.some((value) => value !== "")
            ? gradient
            : [color, color, color]
          ).map((value, index) => (
            <View
              key={index}
              style={[
                styles.paletteColor,
                {
                  backgroundColor: /^#[0-9a-fA-F]{6}$/.test(value)
                    ? value
                    : color,
                },
              ]}
            />
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  contextLogo: {
    width: 64,
    height: 64,
    borderRadius: tokens.media.radius.preview,
    overflow: "hidden",
  },
  contextName: { flex: 1, gap: tokens.spacing.xs },
  divisionLogo: {
    width: 38,
    height: 38,
    borderRadius: tokens.media.radius.tile,
  },
  divisionPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: tokens.media.radius.tile,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  palette: { flexDirection: "row", gap: tokens.spacing.xs },
  paletteColor: { width: 8, height: 18, borderRadius: 2 },
});
