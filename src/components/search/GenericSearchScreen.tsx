import React from "react";
import {
    KeyboardAvoidingView,
    StyleSheet,
    View,
    Text,
    ActivityIndicator,
    Keyboard,
    Platform,
    FlatList,
    ListRenderItem,
} from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SearchBar from "@/src/components/common/SearchBar";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";
import InfoPill from "../common/chips/InfoPill";
import InfoPillGradient from "../common/chips/InfoPillGradient";
import { CTA_GRADIENT } from "../common/GradientButton";

type GenericSearchScreenProps<T> = {
    search: string;
    debouncedQuery: string;
    setSearch: (text: string) => void;
    data: T[] | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
    placeholder: string;
    exampleLabel: string;
    emptyMessage: string;
    renderItem: ListRenderItem<T>;
    keyExtractor?: (item: T, index: number) => string;
};

export const GenericSearchScreen = <T,>({
    search,
    debouncedQuery,
    setSearch,
    data,
    isLoading,
    isError,
    refetch,
    placeholder,
    exampleLabel,
    renderItem,
    emptyMessage,
    keyExtractor,
}: GenericSearchScreenProps<T>) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const renderEmpty = () => {
        if (debouncedQuery.length > 1 && !isLoading && !isError) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textInactive }]}>
                        {emptyMessage}
                    </Text>
                </View>
            );
        }
        return null;
    };

    const defaultKeyExtractor = (item: any) =>
        item?.id?.toString();

    const showHeader = search.length === 0 && !!data && data.length > 0;

    const Header = showHeader ? (
        <View
            style={[
                styles.examplePillContainer,
                { backgroundColor: 'transparent' },
            ]}
        >
            <InfoPillGradient label={exampleLabel} gradient={CTA_GRADIENT} />
        </View>
    ) : null;

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.searchRow}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder={placeholder}
                    inSheet={false}
                />
            </View>

            {isLoading && (
                <ActivityIndicator
                    size="small"
                    color={theme.text}
                    style={styles.loader}
                />
            )}

            {isError && (
                <ErrorState subtitle="Impossible de charger les résultats." onRetry={refetch} />
            )}

            <FlatList
                data={data ?? []}
                keyExtractor={keyExtractor ?? defaultKeyExtractor}
                renderItem={renderItem}
                ListEmptyComponent={renderEmpty}
                ListHeaderComponent={Header}
                stickyHeaderIndices={showHeader ? [0] : undefined}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                contentContainerStyle={{
                    paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT,
                }}
                scrollEnabled={Boolean(data && data.length > 0)}
            />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 8 },
    searchRow: {
        marginTop: 8,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    loader: { marginTop: 8 },
    emptyContainer: { alignItems: "center" },
    emptyText: { fontSize: 14, textAlign: "center" },
    examplePillContainer: {
        alignItems: "center",
        marginBottom: 8,
    },
});