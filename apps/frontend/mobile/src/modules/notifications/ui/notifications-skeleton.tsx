import React from "react";
import { StyleSheet, View } from "react-native";

import { Skeleton } from "@/src/shared/ui/skeleton";

const NotificationsSkeleton = () => {
  return (
    <View style={styles.container} testID="notifications-loading">
      {[0, 1, 2, 3, 4].map((index) => (
        <Skeleton key={index} width="100%" height={110} style={styles.item} />
      ))}
    </View>
  );
};

export default NotificationsSkeleton;

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12, paddingHorizontal: 4 },
  item: { borderRadius: 18 },
});
