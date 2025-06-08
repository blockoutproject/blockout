import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';
import { Pool } from '@/src/types/Pool';
import { useAppTheme } from '@/src/context/ThemeProvider';
import GradientBorderView from '../../common/GradientBorderView';
import { useGlobalBottomSheet } from '@/src/context/GlobalBottomSheetProvider';
import * as Haptics from "expo-haptics";
import PoolContainer from '../../pool/PoolContainer';
import matchStyles from '../matchStyles';

type MatchInfoCardProps = {
    pool: Pool;
    date: string;
    leagueName?: string;
    duration?: string;
    venue?: string;
    referee1?: string;
    referee2?: string;
};

const MatchInfoCard: React.FC<MatchInfoCardProps> = ({
    pool,
    date,
    leagueName,
    duration,
    venue,
    referee1,
    referee2,
}) => {
    const theme = useAppTheme();
    const { openSheet } = useGlobalBottomSheet();

    const handlePoolPress = (poolId: number) => {
        Haptics.selectionAsync();
        openSheet(<PoolContainer poolId={poolId} />);
    };

    const infoData = [
        leagueName && { icon: 'trophy-outline', text: leagueName },
        {
            icon: 'calendar-outline',
            text: new Date(date).toLocaleString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }),
        },
        duration && { icon: 'time-outline', text: duration },
        venue && { icon: 'location-outline', text: venue },
        referee1 && { icon: 'eye-outline', text: referee1 },
        referee2 && { icon: 'eye-outline', text: referee2 },
    ];

    return (
        <GradientBorderView style={matchStyles.infoCard} colorsOverride={[theme.background, theme.background]}>
            <Text style={[matchStyles.infoCardTitle, { color: theme.text }]}>Information</Text>

            <View style={matchStyles.infoRowsWrapper}>
                <TouchableOpacity onPress={() => handlePoolPress(pool.id)} style={matchStyles.infoRow}>
                    <FastImage
                        source={require('@/assets/leagues/msl.png')}
                        style={matchStyles.poolLogo}
                        resizeMode="contain"
                    />
                    <View style={matchStyles.poolTitleWrapper}>
                        <Text
                            style={[matchStyles.poolTitleText, { color: theme.text }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                        >
                            {pool.name ?? 'Chargement...'}
                        </Text>
                    </View>
                </TouchableOpacity>

                {infoData.filter(e => !!e).map((item, index) => (
                    <View style={matchStyles.infoRow} key={index}>
                        <Ionicons
                            name={item.icon as any}
                            size={20}
                            color={theme.text}
                            style={matchStyles.icon}
                        />
                        <Text
                            style={[matchStyles.infoText, { color: theme.text }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                        >
                            {item.text}
                        </Text>
                    </View>
                ))}
            </View>
        </GradientBorderView>
    );
};

export default MatchInfoCard;
