import React, { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { usePoolById } from "@/src/modules/pool/hooks/use-pool-by-id";
import PoolProfile from "@/src/modules/pool/ui/pool-profile";
import PoolTabs from "@/src/modules/pool/ui/pool-tabs";
import ErrorState from "@/src/shared/ui/feedback/error-state";
import { useAppTheme } from "@/src/shared/theme";
import EntityScreenHeader from "@/src/shared/ui/entity/entity-screen-header";
import EntityScreenSkeleton from "@/src/shared/ui/entity/entity-screen-skeleton";
import { ReportTypeEnum } from "@/src/shared/generated/models";
import ReportFormSheet from "@/src/modules/report/ui/report-form-sheet";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";
import PoolFormSheet from "@/src/modules/pool/ui/pool-form-sheet";
import { getEntityScreenState } from "@/src/shared/model/entity-screen-state";

const PoolScreen: React.FC = () => {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams();
  const { data: pool, isLoading, error, refetch } = usePoolById(Number(id));
  const { allowed: canUpdatePool } = useHasScopes(["update:pools"]);

  const formSheetRef = useRef<BottomSheetModal>(null);
  const reportSheetRef = useRef<BottomSheetModal>(null);

  const openForm = useCallback(() => {
    if (!pool) return;
    Haptics.selectionAsync();
    formSheetRef.current?.present();
  }, [pool]);
  const closeForm = useCallback(() => formSheetRef.current?.dismiss(), []);

  const handleOpenReport = useCallback(() => {
    reportSheetRef.current?.present();
  }, []);

  const screenState = getEntityScreenState({ entity: pool, error, isLoading });
  let content: React.ReactNode;

  if (screenState === "loading") {
    content = <EntityScreenSkeleton testID="pool-loading" />;
  } else if (screenState === "error") {
    content = (
      <ErrorState
        subtitle="Impossible de charger la poule."
        onRetry={refetch}
        paddingTop="40%"
        testID="pool-error"
        retryTestID="pool-retry-action"
      />
    );
  } else if (screenState === "not-found" || !pool) {
    content = (
      <ErrorState
        subtitle="Cette poule est introuvable."
        onRetry={refetch}
        paddingTop="40%"
        testID="pool-not-found"
        retryTestID="pool-not-found-retry-action"
      />
    );
  } else {
    content = (
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
  }

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

      {content}

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
