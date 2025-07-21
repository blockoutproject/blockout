import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/src/context/ThemeProvider';

import { useScraperStatuses } from '@/src/hooks/config/scraper/useScraperStatus';
import ConfigApi from '@/src/api/ConfigApi';
import { ScraperStatus } from '@/src/types/ScraperStatus';
import ScraperStatusItem from './ScraperStatusItem';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';

const ScraperStatusScreen = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const { data, isLoading, refetch } = useScraperStatuses();

    const sortedScrapers = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => a.name.localeCompare(b.name));
    }, [data]);

    const toggleScraper = useCallback(
        async (scraper: ScraperStatus) => {
            try {
                await Haptics.selectionAsync();
                await ConfigApi.getInstance().updateScraperStatus(scraper.name, !scraper.enabled);
                await refetch();
            } catch (error) {
                console.error('Erreur lors du toggle scraper :', error);
            }
        },
        [refetch]
    );

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.backgroundSecondary }]}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
            <BottomSheetFlatList
                data={sortedScrapers}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }]}
                renderItem={({ item }) => (
                    <ScraperStatusItem scraper={item} onToggle={() => toggleScraper(item)} />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={{ color: theme.textInactive }}>
                            Aucun scraper trouvé.
                        </Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 12,
    },
    contentContainer: {
        paddingTop: 8, 
        gap: 16
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 32,
    },
});

export default ScraperStatusScreen;