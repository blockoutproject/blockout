import { StyleSheet, View, useWindowDimensions } from "react-native";
import { IdentityCard } from "./identity-card";
import { Skeleton } from "./skeleton";
import { TextSkeleton } from "./text-skeleton";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";

/** Sporting identities reserve metadata and following; a club reserves its municipality instead. */
export function IdentityCardSkeleton({
  club = false,
}: Readonly<{ club?: boolean }>) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const badgeHeight =
    tokens.typography.metadata.lineHeight * fontScale +
    2 * (tokens.spacing.xs + tokens.border.thin);
  return (
    <IdentityCard
      railBackgroundColor={colors.skeletonHeader}
      artworkBackgroundColor={colors.skeleton}
      artwork={
        <Skeleton
          width={tokens.size.media.profile}
          height={tokens.size.media.profile}
          shape="rectangle"
          radius={tokens.media.radius.profile}
        />
      }
    >
      <View style={styles.heading}>
        <TextSkeleton role="metadata" width={86} />
        <TextSkeleton role={club ? "navigation" : "heading"} width="80%" />
      </View>
      {club ? (
        <TextSkeleton role="metadata" width="70%" />
      ) : (
        <>
          <View style={styles.badges}>
            <Skeleton
              width={60 * fontScale + 18}
              height={badgeHeight}
              shape="rectangle"
            />
            <Skeleton
              width={24 * fontScale + 18}
              height={badgeHeight}
              shape="rectangle"
            />
          </View>
          <View style={[styles.follow, { borderColor: colors.border }]}>
            <Skeleton
              width={
                40 * fontScale +
                tokens.spacing.md * 2 +
                tokens.size.icon.md +
                tokens.spacing.sm
              }
              height={Math.max(
                tokens.size.control.compact,
                tokens.typography.body.lineHeight * fontScale +
                  tokens.spacing.sm * 2,
              )}
              shape="rectangle"
            />
            <TextSkeleton width={25} />
          </View>
        </>
      )}
    </IdentityCard>
  );
}

const styles = StyleSheet.create({
  heading: { gap: tokens.spacing.xs },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  follow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    borderTopWidth: tokens.border.thin,
  },
});
