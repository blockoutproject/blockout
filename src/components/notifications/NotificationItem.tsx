import React, { useCallback, useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { EnrichedUserNotification } from "@/src/types/Notification";

/** Single notification row. */
export type NotificationItemProps = {
    /** Notification payload. */
    notification: EnrichedUserNotification;
    /** Called when the row is pressed. */
    onOpen: (notification: EnrichedUserNotification) => void;
};

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onOpen }) => {
    const theme = useAppTheme();

    const ago = useMemo(
        () => formatAgo(notification.createdAt),
        [notification.createdAt]
    );

    const handlePress = useCallback(() => {
        onOpen(notification);
    }, [notification, onOpen]);

    return (
        <Animated.View
            entering={FadeInUp.springify().damping(18).stiffness(120)}
            exiting={FadeOut}
        >
            <Pressable
                onPress={handlePress}
                style={({ pressed }) => [
                    styles.card,
                    {
                        backgroundColor: theme.surface,
                        transform: [
                            {
                                scale: pressed ? 0.97 : 1,
                            },
                        ],
                        shadowColor: theme.text,
                    },
                ]}
                testID="notification-item"
            >
                {notification.divisionLogoUrl && (
                    <Image
                        source={{ uri: notification.divisionLogoUrl }}
                        style={styles.logo}
                    />
                )}

                <View
                    style={styles.content}
                >
                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.text,
                            },
                        ]}
                        numberOfLines={1}
                    >
                        {notification.title}
                    </Text>

                    <Text
                        style={[
                            styles.body,
                            {
                                color: theme.textInactive,
                            },
                        ]}
                        numberOfLines={2}
                    >
                        {notification.body}
                    </Text>

                    <Text
                        style={[
                            styles.time,
                            {
                                color: theme.text,
                            },
                        ]}
                    >
                        {ago}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    );
};

export default NotificationItem;

function formatAgo(iso?: string | null): string {
    if (!iso) {
        return "";
    }
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    if (diff < 60000) {
        return "à l’instant";
    }
    const min = Math.floor(diff / 60000);
    if (min < 60) {
        return `il y a ${min} min`;
    }
    const h = Math.floor(min / 60);
    if (h < 24) {
        return `il y a ${h} h`;
    }
    const day = Math.floor(h / 24);
    return `il y a ${day} j`;
}

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
        backgroundColor: "#EEE",
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: "700",
    },
    body: {
        fontSize: 14,
        marginTop: 2,
        lineHeight: 18,
    },
    time: {
        fontSize: 12,
        marginTop: 6,
    },
});