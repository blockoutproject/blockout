import { ClubSearchDoc } from '@/src/types/docs/ClubSearchDoc';
import React from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
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
            {/* Logo */}
            <FastImage
                source={require("@/assets/clubs/as_cannes.png")}
                style={styles.clubLogo}
                resizeMode="contain"
            />

            {/* Infos de l'équipe */}
            <View style={{ flex: 1 }}>
                <Text style={[styles.clubName, { color: theme.text }]}>{club.name}</Text>
                <Text style={[styles.clubDetails, { color: theme.textInactive }]}>
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
    clubLogo: {
        aspectRatio: 1,
        marginEnd: 16,
        height: 50,
    },
    clubName: {
        fontSize: 18,
        fontWeight: '600',
    },
    clubDetails: {
        marginTop: 4,
    },
});

export default ClubCard;