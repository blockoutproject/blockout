import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/context/ThemeProvider';

type Props = {
    count: number;
};

const FollowersCounter: React.FC<Props> = ({ count }) => {
    const theme = useAppTheme();

    return (
        <View style={styles.container}>
            <Ionicons name="people-outline" size={20} color={theme.text} style={{ marginRight: 4 }} />
            <Text style={[styles.counterText, { color: theme.text }]}>{count}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterText: {
        fontSize: 16,
    },
});

export default FollowersCounter;