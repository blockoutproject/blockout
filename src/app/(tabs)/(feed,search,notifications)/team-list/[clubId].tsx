import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    FlatList,
    Keyboard,
    StyleSheet,
    View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import TeamCard from "@/src/components/teamList/TeamListCard";
import TeamListHeader from "@/src/components/teamList/TeamListHeader";
import ReportFormSheet from "@/src/components/report/ReportFormSheet";
import { ReportType } from "@/src/types/Report";
import { TeamSummaryDTO } from "@/src/types/Team";
import { useTeamListByClubId } from "@/src/hooks/team/useTeamListByClubId";
import FollowedListSkeleton from "@/src/components/followed/FollowedListSkeleton";
import { SelectOption } from "@/src/components/common/form/SelectSheet";
import SeasonSelect from "@/src/components/common/form/SeasonSelect";

const TeamListScreen: React.FC = () => {
    const theme = useAppTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { clubId } = useLocalSearchParams();

    const { data, isLoading, isError, refetch } = useTeamListByClubId(
        String(clubId),
    );

    const [refreshing, setRefreshing] = useState(false);

    const reportSheetRef = useRef<BottomSheetModal>(null);

    const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

    const handleOpenReport = useCallback(() => {
        reportSheetRef.current?.present();
    }, []);

    const handlePress = useCallback(
        (id: number) => {
            Haptics.selectionAsync();
            router.push(`/team/${id}`);
        },
        [router],
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } catch (error) {
            console.error("Error on refresh:", error);
        } finally {
            setRefreshing(false);
        }
    }, [refetch]);

    const renderItem = useCallback(
        ({ item }: { item: TeamSummaryDTO }) => (
            <TeamCard
                team={item}
                onPress={() => handlePress(item.id)}
                testID={`team-card-${item.id}`}
            />
        ),
        [handlePress],
    );

    useEffect(() => {
        const allTeams = data ?? [];
        const seasons = Array.from(
            new Set(
                allTeams
                    .map((t) => t.season)
                    .filter((s): s is string => !!s),
            ),
        ).sort((a, b) => b.localeCompare(a));

        setAvailableSeasons(seasons);

        if (seasons.length === 0) {
            setSelectedSeason(null);
        } else if (!selectedSeason || !seasons.includes(selectedSeason)) {
            setSelectedSeason(seasons[0]);
        }
    }, [data, selectedSeason]);

    const seasonOptions: SelectOption[] = useMemo(
        () => availableSeasons.map((s) => ({ value: s, label: s })),
        [availableSeasons],
    );

    const filteredData: TeamSummaryDTO[] = useMemo(() => {
        const all = data ?? [];
        if (!selectedSeason) return all;
        return all.filter((t) => t.season === selectedSeason);
    }, [data, selectedSeason]);

    const hasData = filteredData.length > 0;

    const body = useMemo(() => {
        if (isLoading && !refreshing) {
            return <FollowedListSkeleton />;
        }

        if (isError) {
            return (
                <ErrorState
                    subtitle="Impossible de charger les équipes."
                    onRetry={refetch}
                    paddingTop={"40%"}
                />
            );
        }

        if (!filteredData || filteredData.length === 0) {
            return (
                <ErrorState
                    subtitle="Aucune équipe trouvée pour ce club."
                    onRetry={refetch}
                    paddingTop={"30%"}
                />
            );
        }

        return (
            <FlatList
                data={filteredData}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                contentContainerStyle={{
                    paddingHorizontal: 8,
                    paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT,
                }}
                scrollEnabled={hasData}
                testID="team-list"
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
        );
    }, [
        isLoading,
        isError,
        filteredData,
        refetch,
        renderItem,
        insets.bottom,
        refreshing,
        onRefresh,
        hasData,
    ]);

    const handleSelectSeason = useCallback((opt: SelectOption) => {
        setSelectedSeason(String(opt.value));
    }, []);

    return (
        <View
            style={[styles.container, { backgroundColor: theme.background }]}
            testID="team-list-screen"
        >
            <TeamListHeader
                title="Équipes"
                onOpenReport={handleOpenReport}
                rightAddon={
                    availableSeasons.length > 0 ? (
                        <SeasonSelect
                            options={seasonOptions}
                            selectedValue={selectedSeason}
                            onSelect={handleSelectSeason}
                            testIDButton="team-list-season-button"
                        />
                    ) : null
                }
            />

            {body}

            <ReportFormSheet
                ref={reportSheetRef}
                context={{
                    screen: `TeamList#${clubId}`,
                    defaultType: ReportType.DISPLAY_BUG,
                }}
                onSuccess={() => {
                    reportSheetRef.current?.dismiss();
                }}
                snapPoint="90%"
                footerLabel="Envoyer"
            />
        </View>
    );
};

export default TeamListScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
});