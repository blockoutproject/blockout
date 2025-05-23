import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';
import { router } from 'expo-router';
import { Pool } from '@/src/types/Pool';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/src/context/ThemeProvider';
import GradientView from '../common/GradientView';

type MatchInfoCardProps = {
    pool: Pool;
    date: string;
    league: string;
    duration?: string;
    venue?: string;
    referee1?: string;
    referee2?: string;
};

const MatchInfoCard: React.FC<MatchInfoCardProps> = ({
    pool,
    date,
    league,
    duration,
    venue,
    referee1,
    referee2,
}) => {
    const theme = useAppTheme();

    const handlePoolPress = (poolId: number) => {
        router.push(`/pool/${poolId}`);
    };

    const infoData = [
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
        <GradientView
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <Text style={[styles.title, { color: theme.text }]}>Information</Text>

            <View style={styles.infoList}>
                <TouchableOpacity onPress={() => handlePoolPress(pool.id)} style={styles.infoRow}>
                    <FastImage
                        source={require('@/assets/leagues/msl.png')}
                        style={styles.poolLogo}
                        resizeMode="contain"
                    />
                    <View style={styles.poolTitleWrapper}>
                        <Text
                            style={[styles.poolTitle, { color: theme.text }]}
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
        </GradientView>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    infoList: {
        flexDirection: 'column',
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
    poolTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    icon: {
        marginRight: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 15,
    },
});

export default MatchInfoCard;