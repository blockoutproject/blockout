import React, {useRef} from "react";
import {StyleSheet, Text, View} from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";

type Props = {
  children: React.ReactNode;
  onDelete: () => Promise<void> | void;
  rightThreshold?: number;
};

const SwipeableRow: React.FC<Props> = ({children, onDelete, rightThreshold = 72}) => {
  const theme = useAppTheme();
  const ref = useRef<React.ComponentRef<typeof ReanimatedSwipeable> | null>(null);

  const renderRightActions = () => (
    <View
      style={[
        styles.rightActionContainer,
        {backgroundColor: theme.error},
      ]}
    >
      <Text style={styles.deleteLabel}>Supprimer</Text>
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      renderRightActions={renderRightActions}
      rightThreshold={rightThreshold}
      overshootRight={false}
      onSwipeableOpen={async (direction) => {
        if (direction === "left") {
          try {
            await onDelete();
          } finally {
            ref.current?.close();
          }
        }
      }}
      childrenContainerStyle={styles.children}
    >
      {children}
    </ReanimatedSwipeable>
  );
};

export default SwipeableRow;

const styles = StyleSheet.create({
  rightActionContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 8,
    marginBottom: 12,
  },
  deleteLabel: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  children: {flex: 1},
});
