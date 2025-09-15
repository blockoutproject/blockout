import React, { useCallback, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { EnrichedUserNotification } from '@/src/types/Notification';

type Props = {
    notification: EnrichedUserNotification;
    onOpen: (notification: EnrichedUserNotification) => void;
};

const NotificationItem: React.FC<Props> = ({ notification, onOpen }) => {
    console.log('Rendering NotificationItem:', notification);
    const theme = useAppTheme();

    const ago = useMemo(() => formatAgo(notification.createdAt), [notification.createdAt]);

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
                        backgroundColor: notification.isRead
                            ? theme.surface
                            : withAlpha(theme.primary, 0.08),
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                ]}
            >
                {/* Logo */}
                {notification.divisionLogoUrl && (
                    <Image source={{ uri: notification.divisionLogoUrl }} style={styles.logo} />
                )}

                {/* Contenu */}
                <View style={styles.content}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                        {notification.title}
                    </Text>
                    <Text style={[styles.body, { color: theme.textInactive }]} numberOfLines={2}>
                        {notification.body}
                    </Text>
                    <Text style={[styles.time, { color: theme.text }]}>{ago}</Text>
                </View>

                {/* Badge non lu */}
                {!notification.isRead && <View style={[styles.badge, { backgroundColor: theme.primary }]} />}
            </Pressable>
        </Animated.View>
    );
};

// Helpers
function formatAgo(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    if (diff < 60000) return 'à l’instant';
    const min = Math.floor(diff / 60000);
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h} h`;
    const day = Math.floor(h / 24);
    return `il y a ${day} j`;
}

function withAlpha(hex: string, alpha: number) {
    if (hex.startsWith('#') && hex.length === 7) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    return hex;
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6,
        elevation: 3,
    },
    logo: {
        width: 44,
        height: 44,
        borderRadius: 10,
        marginRight: 12,
    },
    content: { flex: 1 },
    title: { fontSize: 15, fontWeight: '700' },
    body: { fontSize: 14, marginTop: 2, lineHeight: 18 },
    time: { fontSize: 12, marginTop: 6 },
    badge: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 8,
    },
});

export default NotificationItem;