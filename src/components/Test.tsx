import React, { forwardRef, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';

type Props = {
    label: string;
};

const ListItem = ({ label }: Props) => {
    return (
        <View style={styles.item}>
            <Text>{label}</Text>
        </View>
    );
};


const data = Array.from({ length: 30 }).map((_, i) => `Item ${i + 1}`);

const ExampleBottomSheet = forwardRef<BottomSheet>((_, ref) => {
    const snapPoints = useMemo(() => ['25%', '80%'], []);

    const renderItem = ({ item }: { item: string }) => <ListItem label={item} />;

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            enableContentPanningGesture
            enableHandlePanningGesture
            keyboardBlurBehavior="restore"
        >
            <BottomSheetView>

                <View style={styles.contentContainer}>
                    <Text style={styles.header}>Ligne fixe 1</Text>
                    <Text style={styles.header}>Ligne fixe 2</Text>
                    <Text style={styles.header}>Ligne fixe 3</Text>
                </View>

                <BottomSheetFlatList
                    data={data}
                    keyExtractor={(item) => item}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 50 }}
                    keyboardShouldPersistTaps="handled"
                />
            </BottomSheetView>

        </BottomSheet>
    );
});

export default ExampleBottomSheet;

const styles = StyleSheet.create({
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    header: {
        fontSize: 16,
        fontWeight: '600',
        marginVertical: 4,
    },
    item: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
});