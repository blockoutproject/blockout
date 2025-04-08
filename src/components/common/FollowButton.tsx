import React from 'react';
import { Text, TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import { colors } from '@/src/constants/Colors';
import * as Haptics from 'expo-haptics';

type Props = {
    isFollowing: boolean;
    onPress: (event: GestureResponderEvent) => void;
    disabled?: boolean;
};

const FollowButton: React.FC<Props> = ({ isFollowing, onPress, disabled }) => {
    const handlePress = (e: GestureResponderEvent) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress(e);
    };

    return (
        <TouchableOpacity
            style={[
                styles.followButton,
                isFollowing && styles.followingButton,
            ]}
            onPress={handlePress}
            disabled={disabled}
        >
            <Text
                style={[
                    styles.followText,
                    isFollowing && styles.followingText,
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
        backgroundColor: colors.green,
        borderWidth: 1,
        borderColor: colors.green,
        paddingVertical: 6,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginRight: 12,
    },
    followText: {
        color: colors.light,
        fontSize: 16,
        fontWeight: '600',
    },
    followingButton: {
        backgroundColor: colors.dark,
        borderWidth: 1,
        borderColor: colors.light,
    },
    followingText: {
        color: colors.light,
    },
});

export default FollowButton;