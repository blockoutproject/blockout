import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { ScraperStatus } from '@/src/types/ScraperStatus';
import { Image } from 'expo-image';

interface Props {
    scraper: ScraperStatus;
    onToggle: () => void;
}

const ScraperStatusItem: React.FC<Props> = ({ scraper, onToggle }) => {
    const theme = useAppTheme();

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: theme.surface,
                    borderColor: scraper.enabled ? theme.success : theme.textInactive,
                },
            ]}
            onPress={onToggle}
            activeOpacity={0.8}
        >
            <View style={styles.textWrapper}>
                <Text style={[styles.name, { color: theme.text }]}>
                    {scraper.name}
                </Text>
                <Text
                    style={{
                        color: scraper.enabled ? theme.success : theme.error,
                        fontWeight: '600',
                    }}
                >
                    {scraper.enabled ? 'Activé' : 'Désactivé'}
                </Text>
            </View>
            <Image
                source={
                    scraper.enabled
                        ? require('@/assets/images/scraper-started.jpg')
                        : require('@/assets/images/scraper-stopped.jpg')
                }
                style={[styles.logo, { backgroundColor: theme.text }]}
                contentFit="contain"
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 18,
        paddingVertical: 20,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
    },
    logo: {
        width: 50,
        borderRadius: 10,
        aspectRatio: 1,
    },
    textWrapper: {
        flexDirection: 'column',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ScraperStatusItem;