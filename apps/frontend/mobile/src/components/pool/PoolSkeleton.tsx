import React from "react";
import {StyleSheet, View} from "react-native";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {Skeleton} from "@/src/shared/ui/Skeleton";

/** Skeleton for pool profile. */
const PoolSkeleton: React.FC = () => {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
      testID="pool-skeleton"
    >
      <View
        style={styles.row}
      >
        <Skeleton
          width={100}
          height={100}
          style={{borderRadius: 18}}
        />
        <View
          style={styles.info}
        >
          <View
            style={styles.title}
          >
            <Skeleton
              width={220}
              height={20}
            />
          </View>
          <View
            style={styles.infoLine}
          >
            <Skeleton
              width={170}
              height={13}
              style={{borderRadius: 18}}
            />
          </View>
          <View
            style={styles.infoLine}
          >
            <Skeleton
              width={170}
              height={13}
              style={{borderRadius: 18}}
            />
          </View>
          <View
            style={styles.infoLine}
          >
            <Skeleton
              width={170}
              height={13}
              style={{borderRadius: 18}}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default PoolSkeleton;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    marginBottom: 10,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
});
