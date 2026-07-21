import React, {useCallback} from "react";
import {FlatList, ListRenderItem, StyleProp, StyleSheet, View, ViewStyle,} from "react-native";
import * as Haptics from "expo-haptics";
import {Filter} from "@/src/types/Filter";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import InfoPillGradient from "@/src/shared/ui/chips/InfoPillGradient";

export type FiltersProps = {
  /** Tableau des filtres */
  filters: Filter[];
  /** Setter de l’état des filtres */
  setFilters: (updated: Filter[]) => void;
  /** Sélection unique */
  singleSelect?: boolean;
  /** Au moins un filtre actif requis */
  requireSelection?: boolean;
  /** Style du composant */
  style?: StyleProp<ViewStyle>;
  /** Style du conteneur */
  containerStyle?: StyleProp<ViewStyle>;
  /** Autorise le scroll horizontal */
  scrollable?: boolean;
  /** Dégradé actif/inactif (fallback si getGradient non fourni) */
  activeGradient?: readonly [string, string, ...string[]];
  inactiveGradient?: readonly [string, string, ...string[]];
  /** Largeur de bord en mode border */
  borderWidth?: number;
};

const Filters: React.FC<FiltersProps> = ({
                                           filters,
                                           setFilters,
                                           singleSelect = false,
                                           requireSelection = false,
                                           style,
                                           containerStyle,
                                           scrollable = true,
                                           activeGradient,
                                           inactiveGradient,
                                           borderWidth = 1.5,
                                         }) => {
  const theme = useAppTheme();

  const toggleFilter = useCallback(async (index: number) => {
    const updated = [...filters];

    if (singleSelect) {
      const alreadyActive = updated[index].isActive;
      const isLastActive = updated.filter((f) => f.isActive).length === 1 && alreadyActive;
      if (requireSelection && isLastActive) return;
      updated.forEach((f) => (f.isActive = false));
      if (!alreadyActive) updated[index].isActive = true;
    } else {
      updated[index].isActive = !updated[index].isActive;
    }

    setFilters(updated);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [filters, requireSelection, setFilters, singleSelect]);

  const renderItem: ListRenderItem<Filter> = useCallback(({item, index}) => {
    const active = item.isActive;

    const fallbackActive = activeGradient ?? [theme.borderSecondary, theme.borderSecondary];
    const fallbackInactive = inactiveGradient ?? [theme.border, theme.border];

    const gradient = (active ? fallbackActive : fallbackInactive);

    return (
      <InfoPillGradient
        size="lg"
        label={item.name}
        gradient={gradient}
        variant={active ? "filled" : "border"}
        borderWidth={borderWidth}
        onPress={() => toggleFilter(index)}
      />
    );
  }, [activeGradient, borderWidth, inactiveGradient, theme.border, toggleFilter]);

  return (
    <View style={[style]}>
      <FlatList
        data={filters}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        horizontal
        scrollEnabled={scrollable}
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, containerStyle, {columnGap: 8}]}
      />
    </View>
  );
};

export default Filters;

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
  },
});
