import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import React from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  gradients,
  layout,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { SearchField } from "@/src/shared/ui/search-field";
import FadeIn from "@/src/shared/ui/animations/FadeIn";
import { GradientPill } from "@/src/shared/ui/pill";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";

export type SearchResultsProps<T extends { id: string | number }> = {
  search: string;
  setSearch: (text: string) => void;
  data?: T[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
  placeholder: string;
  exampleLabel: string;
  emptyMessage: string;
  renderItem: (info: ListRenderItemInfo<T>) => React.ReactElement | null;
  filters?: React.ReactNode;
  testID: string;
  inputTestID: string;
  listTestID: string;
};

const SearchResults = <T extends { id: string | number }>({
  search,
  setSearch,
  data,
  isLoading,
  isError,
  refetch,
  placeholder,
  exampleLabel,
  emptyMessage,
  renderItem,
  filters,
  testID,
  inputTestID,
  listTestID,
}: SearchResultsProps<T>) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const hasResults = Boolean(data?.length);
  const showExamples = search.length === 0 && hasResults;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      testID={testID}
    >
      <View style={styles.searchContainer}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder={placeholder}
          inSheet={false}
          testID={inputTestID}
        />
        {filters}
      </View>

      {isLoading ? (
        <ActivityIndicator
          accessibilityLabel="Chargement des résultats"
          size="small"
          color={theme.text}
          style={styles.loader}
        />
      ) : null}

      {isError ? (
        <ErrorState
          subtitle="Impossible de charger les résultats."
          paddingTop="30%"
          onRetry={refetch}
          testID="search-error"
          retryTestID="search-retry-action"
        />
      ) : null}

      <FlashList
        data={data ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textInactive }]}>
                {emptyMessage}
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          showExamples ? (
            <FadeIn>
              <View style={styles.examplePillContainer}>
                <GradientPill
                  borderWidth={1}
                  label={exampleLabel}
                  gradient={gradients.action}
                />
              </View>
            </FadeIn>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + layout.bottomNavigation },
        ]}
        scrollEnabled={hasResults}
        testID={listTestID}
      />
    </KeyboardAvoidingView>
  );
};

export default SearchResults;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[2],
  },
  searchContainer: {
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  loader: { marginTop: spacing[2] },
  emptyContainer: { alignItems: "center", marginTop: spacing[4] },
  emptyText: { ...typography.body, textAlign: "center" },
  examplePillContainer: {
    alignItems: "center",
    marginBottom: spacing[2],
  },
  listContent: {
    paddingTop: 0,
  },
});
