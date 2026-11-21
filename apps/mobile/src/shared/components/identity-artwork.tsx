import { Image, type ImageProps } from "expo-image";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";

/** One authorized identity source; the caller keys this presentation by URI and supplies its named fallback. */
export interface IdentityArtworkProps {
  uri?: string;
  loading?: boolean;
  label: string;
  fallback: ReactNode;
  cachePolicy?: ImageProps["cachePolicy"];
}

/** Fills the clipped IdentityCard slot and covers a new source until native display. */
export function IdentityArtwork({
  uri,
  loading = false,
  label,
  fallback,
  cachePolicy,
}: Readonly<IdentityArtworkProps>) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<"loading" | "displayed" | "failed">(
    "loading",
  );
  const pending = uri ? status === "loading" : loading;
  return (
    <View
      style={[
        styles.artwork,
        { backgroundColor: pending ? undefined : colors.logoSurface },
      ]}
    >
      {uri && status !== "failed" ? (
        <Image
          accessible
          accessibilityRole="image"
          accessibilityLabel={label}
          accessibilityState={{ busy: pending }}
          source={{ uri }}
          contentFit="contain"
          style={StyleSheet.absoluteFill}
          cachePolicy={cachePolicy}
          onDisplay={() => setStatus("displayed")}
          onError={() => setStatus("failed")}
        />
      ) : (
        !pending && fallback
      )}
      {pending && (
        <View
          pointerEvents="none"
          accessible={!uri}
          accessibilityRole={!uri ? "image" : undefined}
          accessibilityLabel={!uri ? label : undefined}
          accessibilityState={{ busy: true }}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.skeleton },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
