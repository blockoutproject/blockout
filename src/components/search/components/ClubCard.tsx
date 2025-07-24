import { ClubSearchDoc } from '@/src/types/docs/ClubSearchDoc';
import React from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useAppTheme } from '@/src/context/ThemeProvider';

interface Props {
    club: ClubSearchDoc;
    onPress: () => void;
}

const ClubCard: React.FC<Props> = ({ club, onPress }) => {
    const theme = useAppTheme();

    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.card,
                {
                    backgroundColor: theme.surface,
                    shadowColor: theme.background,
                },
            ]}
        >
            <Image
                source={
                    club.logoUrl
                        ? { uri: club.logoUrl }
                        : require('@/assets/clubs/default_club_logo.png')
                }
                style={[styles.logo, { backgroundColor: theme.text }]}
                contentFit="contain"
            />

            <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.text }]}>{club.name}</Text>
                <Text style={[styles.details, { color: theme.textInactive }]}>
                    {club.city}
                </Text>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        borderRadius: 20,
    },
    logo: {
        aspectRatio: 1,
        marginRight: 16,
        height: 50,
        borderRadius: 12,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
    },
    details: {
        marginTop: 4,
    },
});

export default ClubCard;