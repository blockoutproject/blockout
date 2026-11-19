import { StyleSheet, View } from "react-native";
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
  return (
    <IdentityCard artwork={null} artworkBackgroundColor={colors.skeleton}>
      <View style={styles.heading}>
        <TextSkeleton role="metadata" width="40%" />
        <TextSkeleton role={club ? "navigation" : "heading"} width="80%" />
      </View>
      {club ? (
        <TextSkeleton role="metadata" width="70%" />
      ) : (
        <>
          <View style={styles.metadata}>
            <TextSkeleton role="metadata" width="60%" />
          </View>
          <View style={styles.action}>
            <Skeleton
              width={tokens.layout.identity.railWidth}
              height={tokens.size.control.compact}
              shape="rectangle"
            />
          </View>
        </>
      )}
    </IdentityCard>
  );
}

const styles = StyleSheet.create({
  heading: { gap: tokens.spacing.xs },
  metadata: { paddingVertical: tokens.spacing.xs + tokens.border.thin },
  action: { paddingTop: tokens.spacing.md + tokens.border.thin },
});
