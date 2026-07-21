import React, {useCallback, useMemo, useRef} from "react";
import {StyleSheet, View} from "react-native";
import {BottomSheetModal} from "@gorhom/bottom-sheet";
import {useLocalSearchParams} from "expo-router";
import * as Haptics from "expo-haptics";
import {useEnrichedTeamById} from "@/src/hooks/team/useEnrichedTeamById";
import TeamSkeleton from "@/src/components/team/TeamSkeleton";
import TeamProfile from "@/src/components/team/TeamProfile";
import TeamTabs from "@/src/components/team/TeamTabs";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import TeamHeader from "@/src/components/team/TeamHeader";
import {ReportType} from "@/src/modules/report/model/Report";
import ReportFormSheet from "@/src/modules/report/ui/ReportFormSheet";
import TeamFormSheet from "@/src/components/team/TeamFormSheet";
import useHasScopes from "@/src/hooks/user/useHasScopes";

const TeamScreen: React.FC = () => {
  const theme = useAppTheme();
  const {id} = useLocalSearchParams();
  const {data: team, isLoading, error, refetch} = useEnrichedTeamById(Number(id));
  const {allowed: canUpdateTeam} = useHasScopes(["update:teams"]);

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
      return (
        <TeamSkeleton/>
      );
    }
    if (error) {
      return (
        <ErrorState
          subtitle="Impossible de charger l'équipe."
          onRetry={refetch}
          paddingTop={"40%"}
        />
      );
    }
    if (!team) {
      return (
        <ErrorState
          subtitle="Cette équipe est introuvable."
          onRetry={refetch}
          paddingTop={"40%"}
        />
      );
    }
    return (
      <>
        <TeamProfile enrichedTeam={team}/>
        <TeamTabs enrichedTeam={team}/>
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
      <TeamHeader
        title={team?.name}
        onOpenReport={handleOpenReport}
        onEdit={canUpdateTeam ? openForm : undefined}
      />

      {body}

      <ReportFormSheet
        ref={reportSheetRef}
        context={{
          screen: `Team#${team?.id}#${team?.name}`,
          defaultType: ReportType.DISPLAY_BUG
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
