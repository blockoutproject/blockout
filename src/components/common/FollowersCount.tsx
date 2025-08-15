import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/context/ThemeProvider';

type Props = {
    count: number;
};

const FollowersCounter: React.FC<Props> = ({ count }) => {
    const theme = useAppTheme();

    return (
        <View style={styles.container}>
            <MaterialCommunityIcons name="account-multiple" size={20} color={theme.text} style={{ marginRight: 6 }} />
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
        fontWeight: '600',
        fontSize: 14,
    },
});

export default FollowersCounter;