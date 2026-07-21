import React from "react";
import {StyleSheet, View} from "react-native";
import {Skeleton} from "@/src/components/common/Skeleton";

const NotificationsSkeleton: React.FC = () => {
  return (
    <View
      style={[
        styles.skeletonContainer,
      ]}
      testID="match-skeleton"
    >
      <Skeleton
        width="100%"
        height={110}
        style={{borderRadius: 18}}
      />
      <Skeleton
        width="100%"
        height={110}
        style={{borderRadius: 18}}
      />
      <Skeleton
        width="100%"
        height={110}
        style={{borderRadius: 18}}
      />
      <Skeleton
        width="100%"
        height={110}
        style={{borderRadius: 18}}
      />
      <Skeleton
        width="100%"
        height={110}
        style={{borderRadius: 18}}
      />
    </View>
  );
};

export default NotificationsSkeleton;

const styles = StyleSheet.create({
  skeletonContainer: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 4,
  },
});
