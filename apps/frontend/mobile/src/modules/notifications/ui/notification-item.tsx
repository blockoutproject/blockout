import { Image } from "expo-image";
import React, { memo, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NotificationResponse } from "@/src/shared/generated/models";
import { formatNotificationAge } from "@/src/modules/notifications/view-models/format-notification-age";
import {
  colors,
  fontWeight,
  radius,
  spacing,
  touchTarget,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import FadeIn from "@/src/shared/ui/animations/fade-in";
import NotificationSwipeAction from "@/src/modules/notifications/ui/notification-swipe-action";

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
    padding: spacing.inset,
    marginHorizontal: spacing[2],
    marginBottom: spacing[3],
    borderRadius: radius.lg,
  },
  logo: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    borderRadius: radius.compact,
    marginRight: spacing[3],
    backgroundColor: colors.surface.logoPlaceholder,
  },
  content: { flex: 1 },
  title: {
    fontSize: typography.bodyStrong.fontSize,
    fontWeight: fontWeight.bold,
  },
  body: {
    fontSize: typography.body.fontSize,
    marginTop: spacing.optical,
    lineHeight: typography.compactStrong.lineHeight,
  },
  time: {
    fontSize: typography.metadata.fontSize,
    marginTop: spacing.tight,
  },
});
