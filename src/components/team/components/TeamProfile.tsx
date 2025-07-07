import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { EnrichedTeamDTO, Team } from '@/src/types/Team';
import { Division } from '@/src/types/Division';
import { useTeamFollowState } from '@/src/hooks/team/useTeamFollowState';
import FollowButton from '@/src/components/common/FollowButton';
import FollowersCounter from '@/src/components/common/FollowersCount';
import { GenderLabels } from '@/src/types/enums/Gender';

type Props = {
    enrichedTeam: EnrichedTeamDTO;
};

const TeamProfile: React.FC<Props> = ({ enrichedTeam }) => {
    const theme = useAppTheme();
    const { isFollowing, isProcessing, followersCount, onToggleFollow } = useTeamFollowState(enrichedTeam);

    const gradient: readonly [string, string, ...string[]] = [
        enrichedTeam.division.firstGradientColor,
        enrichedTeam.division.secondGradientColor,
        enrichedTeam.division.thirdGradientColor,
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.row}>
                <FastImage
                    source={require('@/assets/clubs/as_cannes.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

                <View style={styles.info}>
                    <Text style={[styles.title, { color: theme.text }]}>{enrichedTeam.name}</Text>

                    <View style={styles.infoLine}>
                        <MaterialCommunityIcons name="trophy-outline" size={18} color={theme.text} />
                        <Text style={[styles.infoText, { color: theme.text }]}>{enrichedTeam.division.name}</Text>
                    </View>

                    <View style={styles.infoLine}>
                        <MaterialCommunityIcons name="gender-male-female" size={18} color={theme.text} />
                        <Text style={[styles.infoText, { color: theme.text }]}>{GenderLabels[enrichedTeam.gender]}</Text>
                    </View>

                    <View style={styles.infoLine}>
                        <MaterialCommunityIcons name="link-variant" size={18} color={theme.text} />
                        <Text style={[styles.linkText, { color: theme.text }]}>as-cannes.com</Text>
                    </View>
                </View>
            </View>

            <View style={styles.actionsRow}>
                <FollowButton
                    isFollowing={isFollowing}
                    onPress={onToggleFollow}
                    disabled={isProcessing}
                    gradient={gradient}
                />
                <FollowersCounter count={followersCount} />
            </View>
        </View>
    );
};

export default TeamProfile;

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    logo: {
        width: 100,
        aspectRatio: 1,
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontWeight: '700',
        fontSize: 20,
        marginBottom: 10,
    },
    infoLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 2,
    },
    infoText: {
        fontSize: 14,
    },
    linkText: {
        fontSize: 14,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
});