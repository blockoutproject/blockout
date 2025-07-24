import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/src/context/ThemeProvider';
import { useClubById } from '@/src/hooks/club/useClubById';
import PoolSkeleton from '../pool/components/PoolSkeleton';
import BottomSheetCustomModal from '../common/BottomSheetCustomModal';
import ClubProfile from './components/ClubProfile';
import ClubForm from './components/ClubForm';   // ← composant d’édition

type Props = { clubId: string };

const ClubScreen: React.FC<Props> = ({ clubId }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const formSheetRef = useRef<BottomSheetModal>(null);

    const { data: club, isLoading, isError, refetch } = useClubById(clubId);

    const openForm = () => {
        if (!club) return;
        Haptics.selectionAsync();
        formSheetRef.current?.present();
    };
    const closeForm = () => formSheetRef.current?.dismiss();

    if (isError) {
        return (
            <View style={{ padding: 16 }}>
                <Text style={{ color: theme.error }}>Erreur de chargement</Text>
            </View>
        );
    }

    if (isLoading || !club) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <PoolSkeleton />
            </View>
        );
    }

    return (
        <BottomSheetView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <ClubProfile club={club} onEdit={openForm} />
            </View>

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
        </BottomSheetView>
    );
};

export default ClubScreen;

const styles = StyleSheet.create({
    container: { 
        flex: 1 
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});