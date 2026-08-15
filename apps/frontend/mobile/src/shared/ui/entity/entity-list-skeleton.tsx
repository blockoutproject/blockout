import React from "react";
import { StyleSheet, View } from "react-native";
import { radius, spacing } from "@/src/shared/theme";
import { Skeleton } from "@/src/shared/ui/skeleton";

export type EntityListSkeletonProps = {
  testID: string;
};

const EntityListSkeleton = ({ testID }: EntityListSkeletonProps) => {
  return (
    <View style={[styles.skeletonContainer]} testID={testID}>
      <Skeleton width="100%" height={90} style={styles.item} />
      <Skeleton width="100%" height={90} style={styles.item} />
      <Skeleton width="100%" height={90} style={styles.item} />
      <Skeleton width="100%" height={90} style={styles.item} />
      <Skeleton width="100%" height={90} style={styles.item} />
      <Skeleton width="100%" height={90} style={styles.item} />
      <Skeleton width="100%" height={90} style={styles.item} />
    </View>
  );
};

export default EntityListSkeleton;

const styles = StyleSheet.create({
  skeletonContainer: {
    flex: 1,
    gap: spacing[3],
    paddingHorizontal: spacing[1],
  },
  item: { borderRadius: radius.hero },
});
