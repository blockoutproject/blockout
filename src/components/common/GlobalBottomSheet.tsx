import React from 'react';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { StyleSheet } from 'react-native';

type Props = {
    id: string;
    sheetRef: React.RefObject<BottomSheet>;
    onClose: (id: string) => void;
    children: React.ReactNode;
};

const GlobalBottomSheet: React.FC<Props> = ({ id, sheetRef, onClose, children }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    return (
        <BottomSheet
            ref={sheetRef}
            index={0}
            enablePanDownToClose
            snapPoints={['100%']}
            onClose={() => onClose(id)}
            handleStyle={{
                backgroundColor: theme.background,
                paddingTop: insets.top + 8,
            }}
            handleIndicatorStyle={{
                backgroundColor: theme.text,
            }}
            backgroundStyle={{ backgroundColor: theme.background }}
            style={{
                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: -20,
                },
                shadowOpacity: 0.5,
                shadowRadius: 20.00,

                elevation: 24,
            }}
        >
            <BottomSheetView style={styles.sheetContent}>
                {children}
            </BottomSheetView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    sheetContent: {
        flex: 1,
    },
});

export default GlobalBottomSheet;