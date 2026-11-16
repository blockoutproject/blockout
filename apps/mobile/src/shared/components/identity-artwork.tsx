import { Image, type ImageProps } from "expo-image";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { Skeleton } from "./skeleton";

/** One authorized identity source; the caller keys this presentation by URI and supplies its named fallback. */
export interface IdentityArtworkProps {
  uri?: string;
  loading?: boolean;
  label: string;
  fallback: ReactNode;
  cachePolicy?: ImageProps["cachePolicy"];
}

/** A new keyed source starts covered until native display; missing or failed media reveals only its local fallback. */
export function IdentityArtwork({
  uri,
  loading = false,
  label,
  fallback,
  cachePolicy,
}: Readonly<IdentityArtworkProps>) {
  const [status, setStatus] = useState<"loading" | "displayed" | "failed">(
    "loading",
  );
  const pending = uri ? status === "loading" : loading;
  return (
    <View style={styles.artwork}>
      {uri && status !== "failed" ? (
        <Image
          accessible
          accessibilityRole="image"
          accessibilityLabel={label}
          accessibilityState={{ busy: pending }}
          source={{ uri }}
          contentFit="contain"
          style={styles.image}
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
          style={StyleSheet.absoluteFill}
        >
          <Skeleton
            width={tokens.size.media.profile}
            height={tokens.size.media.profile}
            shape="rectangle"
            radius={tokens.media.radius.profile}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    width: tokens.size.media.profile,
    height: tokens.size.media.profile,
    borderRadius: tokens.media.radius.profile,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    ...StyleSheet.absoluteFill,
    borderRadius: tokens.media.radius.profile,
  },
});
