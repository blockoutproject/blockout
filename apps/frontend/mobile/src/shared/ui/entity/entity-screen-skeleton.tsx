import React from "react";
import { StyleSheet, View } from "react-native";

import { radius, spacing, useAppTheme } from "@/src/shared/theme";
import { Skeleton } from "@/src/shared/ui/skeleton";

export type EntityScreenSkeletonProps = {
  testID: string;
};

const EntityScreenSkeleton = ({ testID }: EntityScreenSkeletonProps) => {
  const theme = useAppTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      testID={testID}
    >
      <View style={styles.row}>
        <Skeleton width={100} height={100} style={styles.logo} />
        <View style={styles.info}>
          <Skeleton width={220} height={20} style={styles.title} />
          <Skeleton width={170} height={13} style={styles.infoLine} />
          <Skeleton width={170} height={13} style={styles.infoLine} />
          <Skeleton width={170} height={13} style={styles.infoLine} />
        </View>
      </View>
    </View>
  );
};

export default EntityScreenSkeleton;

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing[3] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  logo: { borderRadius: radius.hero },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  title: { marginBottom: spacing.compact },
  infoLine: { borderRadius: radius.hero, marginBottom: spacing.tight },
});
