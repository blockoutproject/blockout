import React, { useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import Markdown from "react-native-markdown-display";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, typography, useAppTheme } from "@/src/shared/theme";
import { useLegalDocument } from "@/src/modules/legal/hooks/use-legal-document";
import LegalDocumentHeader from "@/src/modules/legal/ui/legal-document-header";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";
import ErrorState from "@/src/shared/ui/feedback/error-state";
import LegalDocumentFormSheet from "@/src/modules/legal/ui/legal-document-form-sheet";

export type LegalDocumentScreenProps = {
  type: "imprint" | "privacy" | "terms";
  title: string;
  onCloseSheet: () => void;
};

const LegalDocumentScreen: React.FC<LegalDocumentScreenProps> = ({
  type,
  title,
  onCloseSheet,
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const { data, isLoading, error, refetch } = useLegalDocument(type);
  const { allowed: canEdit } = useHasScopes(["update:legal"]);

  const openEdit = () => {
    if (!data) return;
    Haptics.selectionAsync();
    sheetRef.current?.present();
  };
  const closeEdit = () => sheetRef.current?.dismiss();

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  } else if (error) {
    body = (
      <ErrorState
        subtitle="Impossible de charger le document."
        paddingTop="30%"
        onRetry={refetch}
      />
    );
  } else if (!data) {
    body = (
      <ErrorState
        subtitle="Ce document est introuvable."
        paddingTop="30%"
        onRetry={refetch}
      />
    );
  } else {
    body = (
      <>
        <BottomSheetScrollView
          contentContainerStyle={[
            { paddingTop: spacing[2], paddingBottom: insets.bottom },
          ]}
        >
          <Markdown
            style={{
              body: { paddingHorizontal: spacing[4] },
              paragraph: {
                paddingLeft: spacing[2],
                color: theme.text,
                ...typography.documentBody,
                marginBottom: spacing[6],
              },
              heading1: {
                color: theme.text,
                ...typography.documentTitle,
                marginBottom: spacing[3],
              },
              heading2: {
                color: theme.text,
                ...typography.documentHeading,
              },
              heading3: {
                color: theme.text,
                ...typography.documentSubheading,
              },
              bullet_list: { marginBottom: spacing[2] },
              list_item: { ...typography.documentBody, color: theme.text },
            }}
          >
            {data.content}
          </Markdown>

          <Text style={[styles.update, { color: theme.textInactive }]}>
            Dernière mise à jour : {data.version}
          </Text>
        </BottomSheetScrollView>

        <LegalDocumentFormSheet
          ref={sheetRef}
          document={data}
          onSuccess={() => {
            refetch();
            closeEdit();
          }}
          snapPoint="90%"
          footerLabel="Enregistrer"
        />
      </>
    );
  }

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.background }]}
      testID="legal-document-screen"
    >
      <LegalDocumentHeader
        title={title}
        onCloseSheet={onCloseSheet}
        onEdit={canEdit ? openEdit : undefined}
      />
      {body}
    </View>
  );
};

export default LegalDocumentScreen;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  update: {
    textAlign: "center",
    fontSize: typography.metadata.fontSize,
    marginTop: spacing[3],
  },
});
