import React, { useRef } from "react";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import Markdown from "react-native-markdown-display";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useLegalDocument } from "@/src/hooks/config/legalDocument/useLegalDocument";

import BottomSheetCustomModal from "../common/BottomSheetCustomModal";
import LegalDocumentForm from "./components/LegalDocumentForm";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LegalDocumentHeader from "./components/LegalDocumentHeader";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import ErrorState from "@/src/components/common/ErrorState";

type LegalDocumentScreenProps = {
    type: "imprint" | "privacy" | "terms";
    title: string;
    onCloseSheet: () => void;
};

const LegalDocumentScreen: React.FC<LegalDocumentScreenProps> = ({ type, title, onCloseSheet }) => {
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
                message="Impossible de charger le document légal."
                onRetry={refetch}
            />
        );
    } else if (!data) {
        body = (
            <ErrorState
                message="Ce document est introuvable."
                onRetry={refetch}
            />
        );
    } else {
        body = (
            <>
                <BottomSheetScrollView style={[styles.container, { backgroundColor: theme.background }]}>
                    <View style={{ paddingTop: 16, paddingBottom: insets.bottom }}>
                        <Markdown
                            style={{
                                body: { paddingHorizontal: 16 },
                                paragraph: {
                                    paddingLeft: 8,
                                    color: theme.text,
                                    fontSize: 14,
                                    lineHeight: 22,
                                    marginBottom: 24,
                                },
                                heading1: {
                                    color: theme.text,
                                    fontSize: 24,
                                    fontWeight: "700",
                                    lineHeight: 30,
                                    marginBottom: 12,
                                },
                                heading2: { color: theme.text, fontSize: 20, fontWeight: "700", lineHeight: 26 },
                                heading3: { color: theme.text, fontSize: 16, fontWeight: "600", lineHeight: 22 },
                                bullet_list: { marginBottom: 8 },
                                list_item: { fontSize: 14, lineHeight: 22, color: theme.text },
                            }}
                        >
                            {data.content}
                        </Markdown>

                        <Text style={[styles.update, { color: theme.textInactive }]}>
                            Dernière mise à jour : {data.version}
                        </Text>
                    </View>
                </BottomSheetScrollView>

                <BottomSheetCustomModal ref={sheetRef}>
                    <LegalDocumentForm
                        document={data}
                        onSuccess={async () => {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            refetch();
                            closeEdit();
                        }}
                    />
                </BottomSheetCustomModal>
            </>
        );
    }

    return (
        <View style={[styles.screen, { backgroundColor: theme.background }]}>
            <LegalDocumentHeader title={title} onCloseSheet={onCloseSheet} onEdit={canEdit ? openEdit : undefined} />
            {body}
        </View>
    );
};

export default LegalDocumentScreen;

const styles = StyleSheet.create({
    screen: { flex: 1 },
    container: {},
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    update: { textAlign: "center", fontSize: 12, marginTop: 12 },
});