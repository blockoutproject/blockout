import { useAppTheme } from '@/src/context/ThemeProvider';
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export const SearchPrompt = () => {
    const theme = useAppTheme();

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076549.png' }}
                style={[styles.image, { tintColor: theme.textInactive }]}
                resizeMode="contain"
            />

            <Text style={[styles.title, { color: theme.text }]}>
                🔎 Prêt à explorer ?
            </Text>

            <Text style={[styles.subtitle, { color: theme.textInactive }]}>
                Tape quelque chose pour commencer ta recherche !
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingTop: '30%',
    },
    image: {
        width: 120,
        height: 120,
        marginBottom: 24,
        opacity: 0.8,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 22,
    },
});