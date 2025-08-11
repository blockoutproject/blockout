import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useAppTheme } from '@/src/context/ThemeProvider';
import type { CustomUser } from '@/src/types/User';

type Props = {
    user: CustomUser;
};

const UserProfile: React.FC<Props> = ({ user }) => {
    const theme = useAppTheme();

    const avatar = user.pictureUrl || null;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.row}>
                <Image
                    source={
                        avatar
                            ? { uri: avatar }
                            : require('@/assets/users/default_user_avatar.png')
                    }
                    style={[styles.avatar, { backgroundColor: theme.text }]}
                    contentFit="cover"
                />

                <View style={styles.info}>
                    <Text
                        style={[styles.title, { color: theme.text }]}
                        ellipsizeMode="tail"
                        numberOfLines={1}
                    >
                        {user.pseudo || 'Utilisateur'}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 8,
        paddingVertical: 32,
    },
    editIcon: {
        alignSelf: 'flex-end',
        marginBottom: 6
    },
    row: {
        alignItems: 'center',
        gap: 16
    },
    info: {
        maxWidth: '80%',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50
    },
    title: {
        fontWeight: '700',
        fontSize: 20,
        marginBottom: 10
    },
});

export default UserProfile;