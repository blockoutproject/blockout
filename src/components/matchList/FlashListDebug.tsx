import React, { useCallback, useMemo, useState } from "react";
import { View, Text, RefreshControl, ActivityIndicator, StyleSheet } from "react-native";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";

/**
 * FlashList ultra-simplifiée, sans header ni Animated, pour reproduire
 * le bug de RefreshControl "invisible" au premier render.
 *
 * - Données bidon (100 items)
 * - Pull-to-refresh contrôlé
 * - AUCUN contentContainerStyle avec paddingTop
 * - Pas de progressViewOffset (baseline)
 */
export default function FlashListDebug() {
    const [refreshing, setRefreshing] = useState(false);

    const data = useMemo(
        () => Array.from({ length: 100 }, (_, i) => `Item ${i + 1}`),
        []
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Simule un refetch réseau
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<string>) => (
            <View style={styles.row}>
                <Text style={styles.text}>{item}</Text>
            </View>
        ),
        []
    );

    return (
        <View style={styles.container}>
            <FlashList
                data={data}
                renderItem={renderItem}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        progressViewOffset={100}
                    // Laisse volontairement sans progressViewOffset pour le test de base
                    />
                }
                ListFooterComponent={<ActivityIndicator style={{ marginVertical: 16 }} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#101114" },
    row: {
        height: 56,
        justifyContent: "center",
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "rgba(255,255,255,0.1)",
    },
    text: { color: "#fff", fontSize: 16 },
});