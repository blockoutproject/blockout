import { TeamSearchDoc } from '@/src/types/docs/TeamSearchDoc';
import React from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useAppTheme } from '@/src/context/ThemeProvider';

interface Props {
    team: TeamSearchDoc;
    onPress: () => void;
}

const TeamCard: React.FC<Props> = ({ team, onPress }) => {
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
                style={styles.teamLogo}
                resizeMode="contain"
            />

            {/* Infos de l'équipe */}
            <View style={{ flex: 1 }}>
                <Text style={[styles.teamName, { color: theme.text }]}>{team.name}</Text>
                <Text style={[styles.teamDetails, { color: theme.textInactive }]}>
                    {team.divisionName} • {team.gender}
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
        shadowOpacity: 1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    teamLogo: {
        aspectRatio: 1,
        marginEnd: 16,
        height: 50,
    },
    teamName: {
        fontSize: 18,
        fontWeight: '600',
    },
    teamDetails: {
        marginTop: 4,
    },
});

export default TeamCard;