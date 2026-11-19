import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";

/** Common identity geometry; feature owners supply accepted media, decoration, metadata and permitted actions. */
export interface IdentityCardProps {
  artwork: ReactNode;
  atmosphere?: ReactNode;
  borderColor?: string;
  artworkBackgroundColor?: string;
  railBackgroundColor?: string;
  children: ReactNode;
}

/** Presents the shared profile/team/pool/club card without owning image reads or feature state. */
export function IdentityCard({
  artwork,
  atmosphere,
  borderColor,
  artworkBackgroundColor,
  railBackgroundColor,
  children,
}: Readonly<IdentityCardProps>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: borderColor ?? colors.border,
          boxShadow: colors.cardShadow,
        },
      ]}
    >
      {railBackgroundColor && (
        <View
          pointerEvents="none"
          style={[
            styles.railBackground,
            { backgroundColor: railBackgroundColor },
          ]}
        />
      )}
      {atmosphere}
      <View style={styles.rail}>
        <View
          style={[
            styles.artwork,
            { backgroundColor: artworkBackgroundColor ?? colors.logoSurface },
          ]}
        >
          {artwork}
        </View>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    minHeight: tokens.layout.identity.minHeight,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  rail: {
    width: tokens.layout.identity.railWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  railBackground: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: tokens.layout.identity.railWidth,
  },
  artwork: {
    width: tokens.size.media.profile,
    height: tokens.size.media.profile,
    borderRadius: tokens.media.radius.profile,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    padding: tokens.spacing.md,
    gap: tokens.spacing.compact,
  },
});
