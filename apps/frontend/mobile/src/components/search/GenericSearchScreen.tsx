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
    ScrollView,
} from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SearchBar from "@/src/components/common/SearchBar";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";
import InfoPillGradient from "../common/chips/InfoPillGradient";
import { CTA_GRADIENT } from "../common/GradientButton";
import FadeIn from "../common/animations/FadeIn";
import SeasonSelect from "@/src/components/common/form/SeasonSelect";
import DivisionSelect from "@/src/components/common/form/DivisionSelect";
import FormatSelect from "@/src/components/common/form/FormatSelect";
import GenderSelect from "@/src/components/common/form/GenderSelect";
import { SelectOption } from "@/src/components/common/form/SelectSheet";
import { EnumFormat } from "@/src/types/enums/Format";
import { EnumGender } from "@/src/types/enums/Gender";

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

    /** Season filter */
    seasonOptions?: SelectOption[];
    selectedSeason?: string | null;
    onSelectSeason?: (opt: SelectOption) => void;
    seasonPlaceholderLabel?: string;
    seasonTestIDButton?: string;

    /** Division filter */
    divisionOptions?: SelectOption[];
    selectedDivisionId?: number | null;
    onSelectDivision?: (opt: SelectOption) => void;
    divisionPlaceholderLabel?: string;
    divisionTestIDButton?: string;

    /** Format filter */
    selectedFormat?: EnumFormat | null;
    onSelectFormat?: (opt: SelectOption) => void;
    formatPlaceholderLabel?: string;
    formatTestIDButton?: string;

    /** Gender filter */
    selectedGender?: EnumGender | null;
    onSelectGender?: (opt: SelectOption) => void;
    genderPlaceholderLabel?: string;
    genderTestIDButton?: string;
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

    seasonOptions,
    selectedSeason,
    onSelectSeason,
    seasonPlaceholderLabel = "Saison",
    seasonTestIDButton,

    divisionOptions,
    selectedDivisionId,
    onSelectDivision,
    divisionPlaceholderLabel = "Division",
    divisionTestIDButton,

    selectedFormat,
    onSelectFormat,
    formatPlaceholderLabel = "Format",
    formatTestIDButton,

    selectedGender,
    onSelectGender,
    genderPlaceholderLabel = "Genre",
    genderTestIDButton,
}: GenericSearchScreenProps<T>) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const renderEmpty = () => {
        if (!isLoading && !isError) {
            return (
                <View style={styles.emptyContainer}>
                    <Text
                        style={[
                            styles.emptyText,
                            { color: theme.textInactive },
                        ]}
                    >
                        {emptyMessage}
                    </Text>
                </View>
            );
        }
        return null;
    };

    const defaultKeyExtractor = (item: any) => item?.id?.toString();

    const showHeader = search.length === 0 && !!data && data.length > 0;

    const Header = showHeader ? (
        <FadeIn>
            <View
                style={[
                    styles.examplePillContainer,
                    { backgroundColor: "transparent" },
                ]}
            >
                <InfoPillGradient
                    borderWidth={1}
                    label={exampleLabel}
                    gradient={CTA_GRADIENT}
                />
            </View>
        </FadeIn>
    ) : null;

    const showSeasonSelect =
        !!seasonOptions && seasonOptions.length > 0 && !!onSelectSeason;

    const showDivisionSelect =
        !!divisionOptions && divisionOptions.length > 0 && !!onSelectDivision;

    const showFormatSelect = !!onSelectFormat;
    const showGenderSelect = !!onSelectGender;

    const showFiltersRow =
        showSeasonSelect ||
        showDivisionSelect ||
        showFormatSelect ||
        showGenderSelect;

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.searchContainer}>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder={placeholder}
                    inSheet={false}
                />

                {showFiltersRow && (
                    <ScrollView
                        horizontal
                        contentContainerStyle={styles.filtersRow}
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {showSeasonSelect && (
                            <SeasonSelect
                                options={seasonOptions}
                                selectedValue={selectedSeason}
                                onSelect={onSelectSeason!}
                                placeholderLabel={seasonPlaceholderLabel}
                                testIDButton={seasonTestIDButton}
                                style={styles.filterBtn}
                            />
                        )}

                        {showDivisionSelect && (
                            <DivisionSelect
                                options={divisionOptions}
                                selectedValue={selectedDivisionId ?? null}
                                onSelect={onSelectDivision!}
                                placeholderLabel={divisionPlaceholderLabel}
                                testIDButton={divisionTestIDButton}
                                style={styles.filterBtn}
                            />
                        )}

                        {showFormatSelect && (
                            <FormatSelect
                                selectedValue={selectedFormat ?? null}
                                onSelect={onSelectFormat!}
                                placeholderLabel={formatPlaceholderLabel}
                                testIDButton={formatTestIDButton}
                                style={styles.filterBtn}
                            />
                        )}

                        {showGenderSelect && (
                            <GenderSelect
                                selectedValue={selectedGender ?? null}
                                onSelect={onSelectGender!}
                                placeholderLabel={genderPlaceholderLabel}
                                testIDButton={genderTestIDButton}
                                style={styles.filterBtn}
                            />
                        )}
                    </ScrollView>
                )}
            </View>

            {isLoading && (
                <ActivityIndicator
                    size="small"
                    color={theme.text}
                    style={styles.loader}
                />
            )}

            {isError && (
                <ErrorState
                    subtitle="Impossible de charger les résultats."
                    paddingTop={"30%"}
                    onRetry={refetch}
                />
            )}

            <FlatList
                data={data ?? []}
                keyExtractor={keyExtractor ?? defaultKeyExtractor}
                renderItem={renderItem}
                ListEmptyComponent={renderEmpty}
                ListHeaderComponent={Header}
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
    container: {
        flex: 1,
        paddingHorizontal: 8,
    },
    searchContainer: {
        marginTop: 8,
        marginBottom: 8,
    },
    searchBarWrap: {
        flexGrow: 1,
    },
    filtersRow: {
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 8,
        paddingRight: 8,
    },
    filterBtn: {},
    loader: { marginTop: 8 },
    emptyContainer: { alignItems: "center", marginTop: 16 },
    emptyText: { fontSize: 14, textAlign: "center" },
    examplePillContainer: {
        alignItems: "center",
        marginBottom: 8,
    },
});