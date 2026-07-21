import React, {useCallback, useMemo, useRef} from "react";
import {StyleSheet, View} from "react-native";
import {BottomSheetModal} from "@gorhom/bottom-sheet";
import {useLocalSearchParams} from "expo-router";
import * as Haptics from "expo-haptics";
import {useEnrichedPoolById} from "@/src/hooks/pool/useEnrichedPoolById";
import PoolSkeleton from "@/src/components/pool/PoolSkeleton";
import PoolProfile from "@/src/components/pool/PoolProfile";
import PoolTabs from "@/src/components/pool/PoolTabs";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import PoolHeader from "@/src/components/pool/PoolHeader";
import {ReportType} from "@/src/types/Report";
import ReportFormSheet from "@/src/components/report/ReportFormSheet";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import PoolFormSheet from "@/src/components/pool/PoolFormSheet";

const PoolScreen: React.FC = () => {
  const theme = useAppTheme();
  const {id} = useLocalSearchParams();
  const {data: pool, isLoading, error, refetch} = useEnrichedPoolById(Number(id));
  const {allowed: canUpdatePool} = useHasScopes(["update:pools"]);

  const formSheetRef = useRef<BottomSheetModal>(null);
  const reportSheetRef = useRef<BottomSheetModal>(null);

  const openForm = () => {
    if (!pool) return;
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
        <PoolSkeleton/>
      );
    }
    if (error) {
      return (
        <ErrorState
          subtitle="Impossible de charger la poule."
          onRetry={refetch}
          paddingTop="40%"
        />
      );
    }
    if (!pool) {
      return (
        <ErrorState
          subtitle="Cette poule est introuvable."
          onRetry={refetch}
          paddingTop="40%"
        />
      );
    }
    return (
      <>
        <PoolProfile enrichedPool={pool}/>
        <PoolTabs enrichedPool={pool}/>
        <PoolFormSheet
          ref={formSheetRef}
          pool={pool}
          onSuccess={() => {
            refetch();
            closeForm();
          }}
          snapPoint="90%"
          footerLabel="Enregistrer"
        />
      </>
    );
  }, [isLoading, error, pool, refetch]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
      testID="pool-screen"
    >
      <PoolHeader
        title={pool?.name}
        onOpenReport={handleOpenReport}
        onEdit={canUpdatePool ? openForm : undefined}
      />

      {body}

      <ReportFormSheet
        ref={reportSheetRef}
        context={{
          screen: `Pool#${pool?.id}#${pool?.name}`,
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

export default PoolScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
