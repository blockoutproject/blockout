import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import React from "react";
import { Keyboard, KeyboardAvoidingView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { gradients, layout, spacing, useAppTheme } from "@/src/shared/theme";
import { SearchField } from "@/src/shared/ui/search-field";
import FadeIn from "@/src/shared/ui/animations/fade-in";
import { GradientPill } from "@/src/shared/ui/pill";
import ErrorState from "@/src/shared/ui/feedback/error-state";
import LoadingState from "@/src/shared/ui/feedback/loading-state";
import SearchState from "@/src/shared/ui/feedback/search-state";

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
        <LoadingState
          title="Recherche en cours…"
          paddingTop="20%"
          testID="search-loading"
        />
      ) : isError ? (
        <ErrorState
          subtitle="Impossible de charger les résultats."
          paddingTop="30%"
          onRetry={refetch}
          testID="search-error"
          retryTestID="search-retry-action"
        />
      ) : (
        <FlashList
          data={data ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={
            <SearchState title={emptyMessage} testID="search-empty" />
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
      )}
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
  examplePillContainer: {
    alignItems: "center",
    marginBottom: spacing[2],
  },
  listContent: {
    paddingTop: 0,
  },
});
