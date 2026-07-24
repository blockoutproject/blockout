import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/src/shared/ui/skeleton";

export type EntityListSkeletonProps = {
  testID: string;
};

const EntityListSkeleton = ({ testID }: EntityListSkeletonProps) => {
  return (
    <View style={[styles.skeletonContainer]} testID={testID}>
      <Skeleton width="100%" height={90} style={{ borderRadius: 18 }} />
      <Skeleton width="100%" height={90} style={{ borderRadius: 18 }} />
      <Skeleton width="100%" height={90} style={{ borderRadius: 18 }} />
      <Skeleton width="100%" height={90} style={{ borderRadius: 18 }} />
      <Skeleton width="100%" height={90} style={{ borderRadius: 18 }} />
      <Skeleton width="100%" height={90} style={{ borderRadius: 18 }} />
      <Skeleton width="100%" height={90} style={{ borderRadius: 18 }} />
    </View>
  );
};

export default EntityListSkeleton;

const styles = StyleSheet.create({
  skeletonContainer: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 4,
  },
});
