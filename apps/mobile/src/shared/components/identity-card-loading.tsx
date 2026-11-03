import { StyleSheet, View } from "react-native";
import { IdentityCard } from "./identity-card";
import { Skeleton } from "./skeleton";
import { tokens } from "../theme/tokens";

/** Decorative shared identity card; whole-page or section compositions announce their read once. */
export function IdentityCardSkeleton() {
  return (
    <IdentityCard
      artwork={
        <Skeleton
          width={tokens.size.media.profile}
          height={tokens.size.media.profile}
          shape="rectangle"
        />
      }
    >
      <View style={styles.copy}>
        <Skeleton width={72} height={10} />
        <Skeleton width="65%" />
        <Skeleton height={12} />
      </View>
    </IdentityCard>
  );
}

const styles = StyleSheet.create({ copy: { gap: tokens.spacing.compact } });
