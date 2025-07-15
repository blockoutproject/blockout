import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';

type ItemProps = { label: string };
const ListItem = ({ label }: ItemProps) => (
  <View style={styles.item}>
    <Text>{label}</Text>
  </View>
);

const data = Array.from({ length: 30 }, (_, i) => `Item ${i + 1}`);

const ExampleBottomSheet = forwardRef<BottomSheet>((_, ref) => {
  const snapPoints = useMemo(() => ['25%', '80%'], []);

  const gesture = useAnimatedGestureHandler({
    onActive: ({ translationY }) => {
      if (translationY > 16) {
        runOnJS(() => ref && (ref as any).current?.close())();
      }
    },
  });

  const Header = () => (
    <PanGestureHandler onGestureEvent={gesture}>
      <Animated.View style={styles.headerContainer}>
        <Text style={styles.header}>Ligne fixe 1</Text>
        <Text style={styles.header}>Ligne fixe 2</Text>
        <Text style={styles.header}>Ligne fixe 3</Text>
      </Animated.View>
    </PanGestureHandler>
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBlurBehavior="restore"
    >
      <Header />

      <BottomSheetFlatList
        data={data}
        keyExtractor={(item) => item}
        renderItem={({ item }) => <ListItem label={item} />}
        contentContainerStyle={{ paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      />
    </BottomSheet>
  );
});

export default ExampleBottomSheet;

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
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