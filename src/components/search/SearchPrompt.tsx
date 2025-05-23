import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '@/src/constants/Colors';

export const SearchPrompt = () => {
    return (
        <View style={styles.container}>
            <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076549.png' }}
                style={styles.image}
                resizeMode="contain"
            />

            <Text style={styles.title}>
                🔎 Prêt à explorer ?
            </Text>

            <Text style={styles.subtitle}>
                Entre un nom d’équipe pour commencer ta recherche !
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: '40%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    image: {
        width: 120,
        height: 120,
        marginBottom: 24,
        tintColor: colors.inactive,
        opacity: 0.8,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.light,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.inactive,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 22,
    },
});