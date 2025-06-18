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
            enableContentPanningGesture
            enableDynamicSizing={false}
            snapPoints={['100%']}
            onClose={() => onClose(id)}
            handleStyle={[
                styles.handle,
                { backgroundColor: theme.background, paddingTop: insets.top + 8 },
            ]}
            handleIndicatorStyle={{ backgroundColor: theme.text }}
            backgroundStyle={{ backgroundColor: theme.background }}
        >
            <BottomSheetView style={[styles.content]}>
                {children}
            </BottomSheetView>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    handle: {
        
    },
    sheetShadow: {
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -20,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 24,
    },
});

export default GlobalBottomSheet;