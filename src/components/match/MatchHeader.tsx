import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';

const MatchHeader: React.FC = () => {
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]} >
            <View style={[styles.handle, { backgroundColor: theme.text }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 30,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
});

export default MatchHeader;