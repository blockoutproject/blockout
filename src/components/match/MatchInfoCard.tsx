
// components/MatchInfoCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/Colors';
import FastImage from 'react-native-fast-image';
import { router } from 'expo-router';
import { Pool } from '@/src/types/Pool';

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

    const handlePoolPress = (poolId: number) => {
        router.push(`/pool/${poolId}`);
    };

    const infoData = [
        {
            icon: 'calendar-outline', text: new Date(date).toLocaleString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
        },
        duration && { icon: 'time-outline', text: duration },
        venue && { icon: 'location-outline', text: venue },
        referee1 && { icon: 'eye-outline', text: referee1 },
        referee2 && { icon: 'eye-outline', text: referee2 },
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Information</Text>
            <View style={{ gap: 10 }}>
                <View style={styles.infoRow}>
                    <TouchableOpacity onPress={() => handlePoolPress(pool.id)}>
                        <View style={styles.poolHeader}>
                            <FastImage
                                source={require('@/assets/leagues/msl.png')}
                                style={styles.poolLogo}
                                resizeMode="contain"
                            />
                            <Text style={styles.poolTitle}>
                                {pool.pool_name ?? 'Chargement...'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {infoData.filter(e => !!e).map((item, index) => (
                    <View style={styles.infoRow} key={index}>
                        {/* L’icône Ionicons */}
                        <Ionicons
                            name={item.icon as any}
                            size={20}
                            color={colors.light}
                            style={styles.icon}
                        />
                        <Text
                            style={[
                                styles.infoText,
                            ]}
                        >
                            {item.text}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderColor: '#4A4A4A',
        borderRadius: 12,
        backgroundColor: colors.dark,
        padding: 16,
        marginBottom: 16,
    },
    poolHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    poolLogo: {
        width: 20,
        height: 20,
        marginRight: 12,
        borderRadius: 5,
    },
    poolTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.light,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.light,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 12,
    },
    infoText: {
        color: colors.light,
        fontSize: 15,
    },
});

export default MatchInfoCard;