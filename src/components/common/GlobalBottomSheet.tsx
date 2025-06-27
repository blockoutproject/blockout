import React from 'react';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { StyleSheet } from 'react-native';
import { ModalMode } from '@/src/context/GlobalBottomSheetProvider';

type Props = {
    id: string;
    sheetRef: React.RefObject<BottomSheet>;
    onClose: (id: string) => void;
    children: React.ReactNode;
    mode: ModalMode;
};

const GlobalBottomSheet: React.FC<Props> = ({ id, sheetRef, onClose, children, mode }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const isPopup = mode === 'popup';

    return (
        <BottomSheet
            ref={sheetRef}
            index={0}
            backdropComponent={(props: BottomSheetBackdropProps) => (
                <BottomSheetBackdrop
                    {...props}
                    appearsOnIndex={0}
                    disappearsOnIndex={-1}
                    pressBehavior="close"
                    opacity={0.5}
                />
            )}
            enablePanDownToClose
            enableDynamicSizing={isPopup}
            snapPoints={isPopup ? undefined : ['100%']}
            onClose={() => onClose(id)}
            handleStyle={[
                styles.handle,
                isPopup && styles.popupHandle,
                { backgroundColor: isPopup ? theme.backgroundSecondary : theme.background, paddingTop: (isPopup ? 8 : insets.top) + 8 },
            ]}
            handleIndicatorStyle={{ backgroundColor: theme.text }}
            backgroundStyle={{
                backgroundColor: theme.background,
            }}
        >
            <BottomSheetView style={[styles.content, isPopup && styles.popupContent, isPopup && { backgroundColor: theme.backgroundSecondary }]}>
                {children}
            </BottomSheetView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    popupContent: {
        padding: 16,
    },
    handle: {},
    popupHandle: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
});

export default GlobalBottomSheet;