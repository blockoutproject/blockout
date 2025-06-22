import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';
import { Pool } from '@/src/types/Pool';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { useGlobalBottomSheet } from '@/src/context/GlobalBottomSheetProvider';
import * as Haptics from "expo-haptics";
import PoolContainer from '../../pool/PoolScreen';
import GradientView from '../../common/GradientView';
import { GradientVariants } from '@/src/utils/utils';

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
        <View style={[styles.container, { backgroundColor: theme.surface }]} >
            <Text style={[styles.infoCardTitle, { color: theme.text }]}>Information</Text>

            <View style={styles.infoRowsWrapper}>
                <TouchableOpacity onPress={() => handlePoolPress(pool.id)} style={styles.infoRow}>
                    <FastImage
                        source={require('@/assets/leagues/msl.png')}
                        style={styles.poolLogo}
                        resizeMode="contain"
                    />
                    <View style={styles.poolTitleWrapper}>
                        <Text
                            style={[styles.poolTitleText, { color: theme.text }]}
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
                    <View style={styles.infoRow} key={index}>
                        <Ionicons
                            name={item.icon as any}
                            size={20}
                            color={theme.text}
                            style={styles.icon}
                        />
                        <Text
                            style={[styles.infoText, { color: theme.text }]}
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 18,
        padding: 16,

    },
    infoCardTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
    },
    infoRowsWrapper: {
        flexDirection: "column",
        gap: 10,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    poolLogo: {
        width: 20,
        height: 20,
        marginRight: 12,
        borderRadius: 5,
    },
    poolTitleWrapper: {
        flex: 1,
    },
    poolTitleText: {
        fontSize: 14,
        fontWeight: "700",
    },
    icon: {
        marginRight: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
    },
});

export default MatchInfoCard;
