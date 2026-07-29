import React from "react";
import { Keyboard, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";

import type { DivisionResponse } from "@/src/shared/generated/models";
import { useAppTheme } from "@/src/shared/theme";
import DivisionItem from "@/src/modules/division/ui/division-item";

type DivisionListProps = {
  divisions: DivisionResponse[];
  isRefreshing: boolean;
  onDeactivated: () => void;
  onEdit: (division: DivisionResponse) => void;
  onRefresh: () => void;
};

const DivisionList: React.FC<DivisionListProps> = ({
  divisions,
  isRefreshing,
  onDeactivated,
  onEdit,
  onRefresh,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <FlashList
      style={styles.list}
      data={divisions}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <DivisionItem
          division={item}
          onPress={() => onEdit(item)}
          onDeactivated={onDeactivated}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.text}
        />
      }
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={{ color: theme.textInactive }}>
            Aucun résultat trouvé.
          </Text>
        </View>
      }
      onScrollBeginDrag={Keyboard.dismiss}
      showsVerticalScrollIndicator={false}
      testID="division-list"
    />
  );
};

export default DivisionList;

const styles = StyleSheet.create({
  list: { paddingHorizontal: 8 },
  emptyState: { alignItems: "center", marginTop: 32 },
});
