import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";

import { useAppTheme } from "@/src/shared/theme";
import { useClubById } from "@/src/modules/club/hooks/use-club-by-id";
import { useTeamListByClubId } from "@/src/modules/team/hooks/use-team-list-by-club-id";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";

import ErrorState from "@/src/shared/ui/feedback/error-state";
import EntityScreenSkeleton from "@/src/shared/ui/entity/entity-screen-skeleton";
import ClubHeader from "@/src/modules/club/ui/club-header";
import ClubFormSheet from "@/src/modules/club/ui/club-form-sheet";

import ReportFormSheet from "@/src/modules/report/ui/report-form-sheet";
import { ReportTypeEnum } from "@/src/shared/generated/models";

import ClubHero from "@/src/modules/club/ui/club-hero";
import ClubTabs from "@/src/modules/club/ui/club-tabs";
import type { SelectOption } from "@/src/shared/ui/form/select-sheet";
import { useSeasonFilter } from "@/src/shared/hooks/use-season-filter";
import { getEntityScreenState } from "@/src/shared/model/entity-screen-state";

const ClubScreen: React.FC = () => {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams();

  const clubId = String(id);

  const { data: club, isLoading, error, refetch } = useClubById(clubId);
  const { allowed: canUpdateClub } = useHasScopes(["update:clubs"]);

  const {
    data: teams,
    isLoading: isTeamsLoading,
    isError: isTeamsError,
    refetch: refetchTeams,
  } = useTeamListByClubId(clubId);

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

  const {
    availableSeasons,
    selectedSeason,
    setSelectedSeason,
    filteredItems: filteredTeams,
  } = useSeasonFilter(teams);

  const seasonOptions: SelectOption<string>[] = useMemo(
    () => availableSeasons.map((s) => ({ value: s, label: s })),
    [availableSeasons],
  );

  const teamIdsForMatches = useMemo(
    () => filteredTeams.map((t) => t.id),
    [filteredTeams],
  );

  const showSeasonInHero = activeTab !== "info";
  const screenState = getEntityScreenState({ entity: club, error, isLoading });

  let content: React.ReactNode;
  if (screenState === "loading") {
    content = <EntityScreenSkeleton testID="club-loading" />;
  } else if (screenState === "error") {
    content = (
      <ErrorState
        subtitle="Impossible de charger ce club."
        onRetry={refetch}
        paddingTop="40%"
        testID="club-error"
        retryTestID="club-retry-action"
      />
    );
  } else if (screenState === "not-found" || !club) {
    content = (
      <ErrorState
        subtitle="Ce club est introuvable."
        onRetry={refetch}
        paddingTop="40%"
        testID="club-not-found"
        retryTestID="club-not-found-retry-action"
      />
    );
  } else {
    content = (
      <>
        <ClubHero
          club={club}
          onEdit={canUpdateClub ? openForm : undefined}
          showSeasonSelect={showSeasonInHero}
          seasonOptions={seasonOptions}
          selectedSeason={selectedSeason ?? undefined}
          onSelectSeason={setSelectedSeason}
          isSeasonLoading={isTeamsLoading}
          isSeasonError={isTeamsError}
        />

        <ClubTabs
          club={club}
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
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      testID="club-screen"
    >
      <ClubHeader title={club?.name ?? ""} onOpenReport={handleOpenReport} />

      {content}

      <ReportFormSheet
        ref={reportSheetRef}
        context={{
          screen: `Club#${club?.id}#${club?.name}`,
          defaultType: ReportTypeEnum.DISPLAY_BUG,
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
