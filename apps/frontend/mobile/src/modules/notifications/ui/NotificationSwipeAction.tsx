import React, { ReactNode, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { useAppTheme } from "@/src/shared/theme";

type Props = {
  children: ReactNode;
  onDelete: () => Promise<void> | void;
};

const NotificationSwipeAction = ({ children, onDelete }: Props) => {
  const theme = useAppTheme();
  const ref = useRef<React.ComponentRef<typeof ReanimatedSwipeable> | null>(
    null,
  );

  const deleteNotification = async () => {
    try {
      await onDelete();
    } finally {
      ref.current?.close();
    }
  };

  const renderDeleteAction = () => (
    <View style={[styles.deleteAction, { backgroundColor: theme.error }]}>
      <Text style={styles.deleteLabel}>Supprimer</Text>
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      renderRightActions={renderDeleteAction}
      rightThreshold={72}
      overshootRight={false}
      onSwipeableOpen={(direction) => {
        if (direction === "left") void deleteNotification();
      }}
      childrenContainerStyle={styles.children}
    >
      {children}
    </ReanimatedSwipeable>
  );
};

export default NotificationSwipeAction;

const styles = StyleSheet.create({
  deleteAction: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 8,
    marginBottom: 12,
  },
  deleteLabel: { color: "white", fontWeight: "700", fontSize: 14 },
  children: { flex: 1 },
});
