import React from "react";
import { StyleSheet, View } from "react-native";

import {useAppTheme} from "@/src/shared/theme";
import { Skeleton } from "@/src/shared/ui/Skeleton";

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
  container: { paddingHorizontal: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  logo: { borderRadius: 18 },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  title: { marginBottom: 10 },
  infoLine: { borderRadius: 18, marginBottom: 6 },
});
