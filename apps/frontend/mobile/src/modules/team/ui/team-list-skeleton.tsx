import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/src/shared/ui/skeleton";

const TeamListSkeleton: React.FC = () => {
  return (
    <View style={[styles.skeletonContainer]} testID="match-skeleton">
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

export default TeamListSkeleton;

const styles = StyleSheet.create({
  skeletonContainer: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 12,
  },
});
