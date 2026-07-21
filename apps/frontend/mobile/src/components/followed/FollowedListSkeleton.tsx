import React from "react";
import {StyleSheet, View} from "react-native";
import {Skeleton} from "@/src/components/common/Skeleton";

const FollowedListSkeleton: React.FC = () => {
  return (
    <View
      style={[
        styles.skeletonContainer,
      ]}
      testID="match-skeleton"
    >
      <Skeleton
        width="100%"
        height={90}
        style={{borderRadius: 18}}
      />
      <Skeleton
        width="100%"
        height={90}
        style={{borderRadius: 18}}
      />
      <Skeleton
        width="100%"
        height={90}
        style={{borderRadius: 18}}
      />
      <Skeleton
        width="100%"
        height={90}
        style={{borderRadius: 18}}
      />
      <Skeleton
        width="100%"
        height={90}
        style={{borderRadius: 18}}
      />
      <Skeleton
        width="100%"
        height={90}
        style={{borderRadius: 18}}
      />
      <Skeleton
        width="100%"
        height={90}
        style={{borderRadius: 18}}
      />
    </View>
  );
};

export default FollowedListSkeleton;

const styles = StyleSheet.create({
  skeletonContainer: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 4,
  },
});
