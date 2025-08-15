import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useClubById } from "@/src/hooks/club/useClubById";
import PoolSkeleton from "../pool/components/PoolSkeleton";
import BottomSheetCustomModal from "../common/BottomSheetCustomModal";
import ClubProfile from "./components/ClubProfile";
import ClubForm from "./components/ClubForm";
import ErrorState from "@/src/components/common/ErrorState";
import { SheetStackParamList } from "../common/BottomSheetNavigator";
import { RouteProp, useRoute } from "@react-navigation/native";
import ClubHeader from "./components/ClubHeader";
import useHasScopes from "@/src/hooks/user/useHasScopes";

type ClubRouteProp = RouteProp<SheetStackParamList, "Club">;

type ClubScreenProps = {
    onCloseSheet: () => void;
};

const ClubScreen: React.FC<ClubScreenProps> = ({ onCloseSheet }) => {
    const { params } = useRoute<ClubRouteProp>();
    const clubId = params.clubId;

    const theme = useAppTheme();
    const { data: club, isLoading, error, refetch } = useClubById(clubId);

    const formSheetRef = useRef<BottomSheetModal>(null);
    const { allowed: canUpdateClub } = useHasScopes(["update:clubs"]);

    const openForm = () => {
        if (!club) return;
        Haptics.selectionAsync();
        formSheetRef.current?.present();
    };
    const closeForm = () => formSheetRef.current?.dismiss();

    let body: React.ReactNode;
    if (isLoading) {
        body = (
            <View style={styles.center}>
                <PoolSkeleton />
            </View>
        );
    } else if (error) {
        body = <ErrorState message="Impossible de charger ce club." onRetry={refetch} />;
    } else if (!club) {
        body = <ErrorState message="Ce club est introuvable." onRetry={refetch} />;
    } else {
        body = (
            <>
                <ClubProfile club={club} />
                <BottomSheetCustomModal ref={formSheetRef}>
                    <ClubForm
                        club={club}
                        onSuccess={async () => {
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            refetch();
                            closeForm();
                        }}
                    />
                </BottomSheetCustomModal>
            </>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ClubHeader
                title="Profil"
                onEdit={canUpdateClub ? openForm : undefined}
                onCloseSheet={onCloseSheet}
            />
            {body}
        </View>
    );
};

export default ClubScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
});