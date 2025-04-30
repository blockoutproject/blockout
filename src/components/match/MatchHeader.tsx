import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/src/constants/Colors';
import { useMatchById } from '@/src/hooks/match/useMatchById';
import { usePoolById } from '@/src/hooks/pool/usePoolById';

const MatchHeader: React.FC = () => {
    const { match_id } = useLocalSearchParams();
    const matchId = Number(match_id);
    const { match } = useMatchById(matchId);
    const { data: pool } = usePoolById(match?.pool_id);

    const handlePoolPress = (poolId: number) => {
        router.push(`/pool/${poolId}`);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <Ionicons name="arrow-back" size={30} color={colors.light} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.titleWrapper}
                onPress={() => pool && handlePoolPress(pool.id)}
            >
                <FastImage
                    source={require('@/assets/leagues/msl.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text
                    style={styles.title}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.9}
                >
                    {pool ? pool.pool_name : 'Chargement...'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => console.log("Share pressed!")} style={styles.iconButton}>
                <Ionicons name="share-outline" size={30} color={colors.light} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.dark,
        paddingHorizontal: 12,
        paddingVertical: 15,
    },
    iconButton: {
        padding: 4,
    },
    titleWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 12,
    },
    logo: {
        width: 25,
        height: 25,
        marginRight: 8,
        borderRadius: 5,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.active,
        flexShrink: 1,
    },
});

export default MatchHeader;