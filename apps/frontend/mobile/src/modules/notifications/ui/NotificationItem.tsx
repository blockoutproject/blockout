import { Image } from "expo-image";
import React, { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NotificationResponse } from "@/src/shared/generated/models";
import { formatNotificationAge } from "@/src/modules/notifications/model/formatNotificationAge";
import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import FadeIn from "@/src/shared/ui/animations/FadeIn";
import NotificationSwipeAction from "@/src/modules/notifications/ui/NotificationSwipeAction";

export type NotificationItemProps = {
  notification: NotificationResponse;
  onOpen: (notification: NotificationResponse) => void;
  onDelete: (notification: NotificationResponse) => Promise<void>;
};

const NotificationItem = ({
  notification,
  onOpen,
  onDelete,
}: NotificationItemProps) => {
  const theme = useAppTheme();
  const age = useMemo(
    () => formatNotificationAge(notification.createdAt),
    [notification.createdAt],
  );

  const handlePress = useCallback(() => {
    onOpen(notification);
  }, [notification, onOpen]);

  const handleDelete = useCallback(
    () => onDelete(notification),
    [notification, onDelete],
  );

  return (
    <FadeIn>
      <NotificationSwipeAction onDelete={handleDelete}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${notification.title}. ${notification.body}`}
          accessibilityHint="Ouvre la notification"
          accessibilityActions={[
            { name: "delete", label: "Supprimer la notification" },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "delete") void handleDelete();
          }}
          onPress={handlePress}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: pressed ? theme.pressed : theme.surface,
              shadowColor: theme.text,
            },
          ]}
          testID={`notifications-item-${notification.id}`}
        >
          {!!notification.divisionLogoUrl && (
            <Image
              accessible={false}
              contentFit="cover"
              recyclingKey={String(notification.id)}
              source={{ uri: notification.divisionLogoUrl }}
              style={styles.logo}
            />
          )}

          <View style={styles.content}>
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text
              style={[styles.body, { color: theme.textInactive }]}
              numberOfLines={2}
            >
              {notification.body}
            </Text>
            <Text style={[styles.time, { color: theme.text }]}>{age}</Text>
          </View>
        </Pressable>
      </NotificationSwipeAction>
    </FadeIn>
  );
};

export default memo(NotificationItem);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginHorizontal: 8,
    marginBottom: 12,
    borderRadius: 16,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#eeeeee",
  },
  content: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700" },
  body: { fontSize: 14, marginTop: 2, lineHeight: 18 },
  time: { fontSize: 12, marginTop: 6 },
});
