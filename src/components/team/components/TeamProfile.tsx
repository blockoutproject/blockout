import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { EnrichedTeamDTO, Team } from '@/src/types/Team';
import { useTeamFollowState } from '@/src/hooks/team/useTeamFollowState';
import FollowButton from '@/src/components/common/FollowButton';
import FollowersCounter from '@/src/components/common/FollowersCount';
import { EnumGender, GenderLabels } from '@/src/types/enums/Gender';
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import BottomSheetCustomPage from '../../common/BottomSheetCustomPage';
import ClubScreen from '../../club/ClubScreen';
import BottomSheetCustomModal from '../../common/BottomSheetCustomModal';

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

    const clubSheetRef = useRef<BottomSheetModal>(null);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

    const openClubSheet = (id: string) => {
        Haptics.selectionAsync();
        setSelectedClubId(id);
        clubSheetRef.current?.present();
    };

    return (
        <>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.row}>
                    <Image
                        source={
                            enrichedTeam.club.logoUrl
                                ? { uri: enrichedTeam.club.logoUrl }
                                : require('@/assets/clubs/default_club_logo.png')
                        }
                        style={[styles.logo, { backgroundColor: theme.text }]}
                        contentFit="contain"
                    />

                    <View style={styles.info}>
                        <Text 
                            style={[styles.title, { color: theme.text }]}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                        >
                            {enrichedTeam.name}
                        </Text>

                        <View style={styles.infoLine}>
                            <MaterialCommunityIcons name="trophy" size={18} color={theme.text} />
                            <Text style={[styles.infoText, { color: theme.text }]}>{enrichedTeam.division.name}</Text>
                        </View>

                        <View style={styles.infoLine}>
                            {enrichedTeam.gender === EnumGender.M && <MaterialCommunityIcons name="gender-male" size={18} color={theme.text} />}
                            {enrichedTeam.gender === EnumGender.F && <MaterialCommunityIcons name="gender-female" size={18} color={theme.text} />}
                            {enrichedTeam.gender === EnumGender.O && <MaterialCommunityIcons name="gender-male-female" size={18} color={theme.text} />}
                            <Text style={[styles.infoText, { color: theme.text }]}>{GenderLabels[enrichedTeam.gender]}</Text>
                        </View>

                        <View style={styles.infoLine}>
                            <MaterialCommunityIcons name="calendar" size={18} color={theme.text} />
                            <Text style={[styles.infoText, { color: theme.text }]}>{enrichedTeam.season}</Text>
                        </View>

                        <TouchableOpacity onPress={() => openClubSheet(enrichedTeam.club.id)} style={styles.infoLine}>
                            <MaterialCommunityIcons name="home" size={18} color={theme.text} />
                            <Text
                                style={[styles.infoText, { color: theme.text, textDecorationLine: 'underline', fontWeight: '500' }]}
                                
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {enrichedTeam.club.name}
                            </Text>
                        </TouchableOpacity>
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

            <BottomSheetCustomPage ref={clubSheetRef}>
                {selectedClubId && <ClubScreen clubId={selectedClubId} />}
            </BottomSheetCustomPage>
        </>
    );
};

export default TeamProfile;

const styles = StyleSheet.create({
    container: {
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
        borderRadius: 24
    },
    clubLogo: {
        width: 18,
        aspectRatio: 1,
        borderRadius: 5,
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontWeight: '700',
        fontSize: 18,
        marginBottom: 10,
    },
    infoLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    infoText: {
        fontSize: 14,
        fontWeight: '500',
    },
    linkText: {
        fontSize: 14,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
});