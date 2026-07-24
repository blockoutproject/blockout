import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { usePoolById } from "@/src/modules/pool/hooks/usePoolById";
import PoolProfile from "@/src/modules/pool/ui/pool-profile";
import PoolTabs from "@/src/modules/pool/ui/PoolTabs";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";
import { useAppTheme } from "@/src/shared/theme";
import EntityScreenHeader from "@/src/shared/ui/entity/entity-screen-header";
import EntityScreenSkeleton from "@/src/shared/ui/entity/EntityScreenSkeleton";
import { ReportTypeEnum } from "@/src/shared/generated/models";
import ReportFormSheet from "@/src/modules/report/ui/ReportFormSheet";
import useHasScopes from "@/src/modules/user/hooks/useHasScopes";
import PoolFormSheet from "@/src/modules/pool/ui/PoolFormSheet";

const PoolScreen: React.FC = () => {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams();
  const { data: pool, isLoading, error, refetch } = usePoolById(Number(id));
  const { allowed: canUpdatePool } = useHasScopes(["update:pools"]);

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
      return <EntityScreenSkeleton testID="pool-loading" />;
    }
    if (error) {
      return (
        <ErrorState
          subtitle="Impossible de charger la poule."
          onRetry={refetch}
          paddingTop="40%"
          testID="pool-error"
          retryTestID="pool-retry-action"
        />
      );
    }
    if (!pool) {
      return (
        <ErrorState
          subtitle="Cette poule est introuvable."
          onRetry={refetch}
          paddingTop="40%"
          testID="pool-not-found"
          retryTestID="pool-not-found-retry-action"
        />
      );
    }
    return (
      <>
        <PoolProfile enrichedPool={pool} />
        <PoolTabs enrichedPool={pool} />
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
      <EntityScreenHeader
        title={pool?.name}
        onOpenReport={handleOpenReport}
        onEdit={canUpdatePool ? openForm : undefined}
        testID="pool-header"
        backActionTestID="pool-back-action"
        editActionTestID="pool-edit-action"
        reportActionTestID="pool-report-action"
      />

      {body}

      <ReportFormSheet
        ref={reportSheetRef}
        context={{
          screen: `Pool#${pool?.id}#${pool?.name}`,
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

export default PoolScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
