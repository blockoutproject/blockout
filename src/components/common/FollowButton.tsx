import React from 'react';
import { Text, TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/src/context/ThemeProvider';

type Props = {
    isFollowing: boolean;
    onPress: (event: GestureResponderEvent) => void;
    disabled?: boolean;
};

const FollowButton: React.FC<Props> = ({ isFollowing, onPress, disabled }) => {
    const theme = useAppTheme();

    const handlePress = (e: GestureResponderEvent) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress(e);
    };

    return (
        <TouchableOpacity
            style={[
                styles.followButton,
                {
                    backgroundColor: isFollowing ? theme.background : theme.success,
                    borderColor: isFollowing ? theme.text : theme.success,
                },
            ]}
            onPress={handlePress}
            disabled={disabled}
        >
            <Text
                style={[
                    styles.followText,
                    { color: theme.text },
                ]}
            >
                {isFollowing ? 'Suivie' : 'Suivre'}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        paddingVertical: 6,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginRight: 12,
    },
    followText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default FollowButton;