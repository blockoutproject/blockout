import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTeamById } from "@/src/modules/team/hooks/use-team-by-id";
import TeamProfile from "@/src/modules/team/ui/team-profile";
import TeamTabs from "@/src/modules/team/ui/team-tabs";
import ErrorState from "@/src/shared/ui/feedback/error-state";
import { useAppTheme } from "@/src/shared/theme";
import EntityScreenHeader from "@/src/shared/ui/entity/entity-screen-header";
import EntityScreenSkeleton from "@/src/shared/ui/entity/entity-screen-skeleton";
import { ReportTypeEnum } from "@/src/shared/generated/models";
import ReportFormSheet from "@/src/modules/report/ui/report-form-sheet";
import TeamFormSheet from "@/src/modules/team/ui/team-form-sheet";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";

const TeamScreen: React.FC = () => {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams();
  const { data: team, isLoading, error, refetch } = useTeamById(Number(id));
  const { allowed: canUpdateTeam } = useHasScopes(["update:teams"]);

  const formSheetRef = useRef<BottomSheetModal>(null);
  const reportSheetRef = useRef<BottomSheetModal>(null);

  const openForm = () => {
    if (!team) return;
    Haptics.selectionAsync();
    formSheetRef.current?.present();
  };
  const closeForm = () => formSheetRef.current?.dismiss();

  const handleOpenReport = useCallback(() => {
    reportSheetRef.current?.present();
  }, []);

  const body = useMemo(() => {
    if (isLoading) {
      return <EntityScreenSkeleton testID="team-loading" />;
    }
    if (error) {
      return (
        <ErrorState
          subtitle="Impossible de charger l'équipe."
          onRetry={refetch}
          paddingTop={"40%"}
          testID="team-error"
          retryTestID="team-retry-action"
        />
      );
    }
    if (!team) {
      return (
        <ErrorState
          subtitle="Cette équipe est introuvable."
          onRetry={refetch}
          paddingTop={"40%"}
          testID="team-not-found"
          retryTestID="team-not-found-retry-action"
        />
      );
    }
    return (
      <>
        <TeamProfile enrichedTeam={team} />
        <TeamTabs enrichedTeam={team} />
        <TeamFormSheet
          ref={formSheetRef}
          team={team}
          onSuccess={() => {
            refetch();
            closeForm();
          }}
          snapPoint="90%"
          footerLabel="Enregistrer"
        />
      </>
    );
  }, [isLoading, error, team, refetch]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
      testID="team-screen"
    >
      <EntityScreenHeader
        title={team?.name}
        onOpenReport={handleOpenReport}
        onEdit={canUpdateTeam ? openForm : undefined}
        testID="team-header"
        backActionTestID="team-back-action"
        editActionTestID="team-edit-action"
        reportActionTestID="team-report-action"
      />

      {body}

      <ReportFormSheet
        ref={reportSheetRef}
        context={{
          screen: `Team#${team?.id}#${team?.name}`,
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

export default TeamScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
