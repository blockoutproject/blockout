import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/src/shared/ui/skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout, radius, spacing } from "@/src/shared/theme";

/** Skeleton for match screen while loading. */
const MatchSkeleton: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.skeletonContainer,
        {
          paddingTop: insets.top + layout.header,
        },
      ]}
      testID="match-skeleton"
    >
      <Skeleton width="100%" height={200} style={styles.item} />
      <Skeleton width="100%" height={150} style={styles.item} />
      <Skeleton width="100%" height={200} style={styles.item} />
      <Skeleton width="100%" height={250} style={styles.item} />
    </View>
  );
};

export default MatchSkeleton;

const styles = StyleSheet.create({
  skeletonContainer: {
    flex: 1,
    gap: spacing[5],
    paddingHorizontal: spacing[1],
  },
  item: { borderRadius: radius.hero },
});
