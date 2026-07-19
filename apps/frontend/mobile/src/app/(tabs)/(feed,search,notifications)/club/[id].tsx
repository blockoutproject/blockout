import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useClubById } from "@/src/hooks/club/useClubById";
import { useTeamListByClubId } from "@/src/hooks/team/useTeamListByClubId";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import { useNavigationInterstitial } from "@/src/hooks/ads/useNavigationInterstitial";

import ErrorState from "@/src/components/common/feedback/ErrorState";
import ClubSkeleton from "@/src/components/club/ClubSkeleton";
import ClubHeader from "@/src/components/club/ClubHeader";
import ClubFormSheet from "@/src/components/club/ClubFormSheet";

import ReportFormSheet from "@/src/components/report/ReportFormSheet";
import { ReportType } from "@/src/types/Report";

import ClubProfile from "@/src/components/club/ClubProfile";
import ClubTabs from "@/src/components/club/ClubTabs";
import { TeamSummaryDTO } from "@/src/types/Team";
import { SelectOption } from "@/src/components/common/form/SelectSheet";

const ClubScreen: React.FC = () => {
    const theme = useAppTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const clubId = String(id);

    const { data: club, isLoading, error, refetch } = useClubById(clubId);
    const { allowed: canUpdateClub } = useHasScopes(["update:clubs"]);
    const { handleNavigationWithAd } = useNavigationInterstitial();

    const {
        data: teams,
        isLoading: isTeamsLoading,
        isError: isTeamsError,
        refetch: refetchTeams,
    } = useTeamListByClubId(clubId);

    const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<string | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<string>("info");

    const formSheetRef = useRef<BottomSheetModal>(null);
    const reportSheetRef = useRef<BottomSheetModal>(null);

    const openForm = useCallback(() => {
        if (!club) return;
        Haptics.selectionAsync();
        formSheetRef.current?.present();
    }, [club]);

    const closeForm = useCallback(() => {
        formSheetRef.current?.dismiss();
    }, []);

    const handleOpenReport = useCallback(() => {
        reportSheetRef.current?.present();
    }, []);

    useEffect(() => {
        const all = teams ?? [];
        const seasons = Array.from(
            new Set(all.map((t) => t.season).filter((s): s is string => !!s))
        ).sort((a, b) => b.localeCompare(a));

        setAvailableSeasons(seasons);
        setSelectedSeason((prev) => (prev && seasons.includes(prev) ? prev : seasons[0]));
    }, [teams]);

    const seasonOptions: SelectOption[] = useMemo(
        () => availableSeasons.map((s) => ({ value: s, label: s })),
        [availableSeasons]
    );

    const filteredTeams: TeamSummaryDTO[] = useMemo(() => {
        const all = teams ?? [];
        if (!selectedSeason) return all;
        return all.filter((t) => t.season === selectedSeason);
    }, [teams, selectedSeason]);

    const teamIdsForMatches = useMemo(
        () => filteredTeams.map((t) => t.id),
        [filteredTeams]
    );

    const showSeasonInHero = activeTab !== "info";

    const body = useMemo(() => {
        if (isLoading) return <ClubSkeleton />;

        if (error) {
            return (
                <ErrorState
                    subtitle="Impossible de charger ce club."
                    onRetry={refetch}
                    paddingTop="40%"
                />
            );
        }

        if (!club) {
            return (
                <ErrorState
                    subtitle="Ce club est introuvable."
                    onRetry={refetch}
                    paddingTop="40%"
                />
            );
        }

        return (
            <>
                <ClubProfile
                    club={club}
                    onEdit={canUpdateClub ? openForm : undefined}
                    showSeasonSelect={showSeasonInHero}
                    seasonOptions={seasonOptions}
                    selectedSeason={selectedSeason}
                    onSelectSeason={(opt) => {
                        if (typeof opt.value !== "string" || !opt.value) return;
                        setSelectedSeason(opt.value);
                    }}
                    isSeasonLoading={isTeamsLoading}
                    isSeasonError={isTeamsError}
                    onRetrySeason={refetchTeams}
                />

                <ClubTabs
                    club={club}
                    selectedSeason={selectedSeason}
                    teams={filteredTeams}
                    teamIdsForMatches={teamIdsForMatches}
                    onRefreshTeams={refetchTeams}
                    isTeamsLoading={isTeamsLoading}
                    isTeamsError={isTeamsError}
                    onTabChange={setActiveTab}
                />

                <ClubFormSheet
                    ref={formSheetRef}
                    club={club}
                    onSuccess={() => {
                        refetch();
                        refetchTeams();
                        closeForm();
                    }}
                    snapPoint="90%"
                    footerLabel="Enregistrer"
                />
            </>
        );
    }, [
        isLoading,
        error,
        club,
        refetch,
        canUpdateClub,
        openForm,
        closeForm,
        showSeasonInHero,
        seasonOptions,
        selectedSeason,
        isTeamsLoading,
        isTeamsError,
        refetchTeams,
        filteredTeams,
        teamIdsForMatches,
    ]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]} testID="club-screen">
            <ClubHeader title={club?.name ?? ""} onOpenReport={handleOpenReport} />

            {body}

            <ReportFormSheet
                ref={reportSheetRef}
                context={{
                    screen: `Club#${club?.id}#${club?.name}`,
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

export default ClubScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
});