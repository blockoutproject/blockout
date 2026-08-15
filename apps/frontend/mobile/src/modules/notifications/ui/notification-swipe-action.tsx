import React, { ReactNode, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import {
  colors,
  fontWeight,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";

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
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    marginHorizontal: spacing[2],
    marginBottom: spacing[3],
  },
  deleteLabel: {
    color: colors.text.primary,
    fontSize: typography.body.fontSize,
    fontWeight: fontWeight.bold,
  },
  children: { flex: 1 },
});
