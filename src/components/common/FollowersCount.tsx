import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/Colors';

type Props = {
    count: number;
};

const FollowersCounter: React.FC<Props> = ({ count }) => (
    <View style={styles.container}>
        <Ionicons name="people-outline" size={20} color={colors.light} style={{ marginRight: 4 }} />
        <Text style={styles.counterText}>{count}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterText: {
        color: colors.light,
        fontSize: 16,
    },
});

export default FollowersCounter;