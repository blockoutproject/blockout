import { PageFlatList } from "@/shared/components/page-list";
import { ListSeparator } from "@/shared/components/list-separator";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { PageHeader } from "@/shared/components/page-header";

import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import {
  Page,
  PageScrollView,
  PageContent,
  pageContentStyle,
} from "@/shared/components/page";
import { EmptyState } from "@/shared/components/state-card";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "expo-router";
import { ChevronRight, Eraser, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DivisionResponse } from "../../../../.generated/schemas/index.zod";
import { IconButton } from "@/shared/components/icon-button";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { Button } from "@/shared/components/button";
import { ReloadButton } from "@/shared/components/reload-button";
import { SearchField } from "@/shared/components/search-field";

import { DivisionsLoading } from "../components/divisions-loading";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useDivisions } from "../api/classification";
import { usePresentationLogo } from "../api/presentation";
import { DivisionPaint } from "@/features/sporting/components/division-paint";
import { SportingMedia } from "@/features/sporting/components/sporting-media";

import {
  divisionSearchSchema,
  type DivisionSearchValues,
} from "../schemas/division-search-schema";
import { divisionSearchValues } from "../forms/division-search-values";

/** Product Design 1340:9338: searchable active/inactive catalogue; commands belong to its editor. */
export function DivisionsScreen() {
  const { authority, query } = useDivisions();
  const { colors, membership } = useTheme();
  const router = useRouter();
  const { control, reset } = useForm<DivisionSearchValues>({
    resolver: zodResolver(divisionSearchSchema),
    defaultValues: divisionSearchValues(),
    mode: "onChange",
  });
  const search = useWatch({ control, name: "search" });
  const [active, setActive] = useState(true);
  const canEdit =
    authority.permissions?.manageSportingPresentation === true ||
    authority.permissions?.manageDivisionLifecycle === true;
  const failed = hasReadError(query);
  const items =
    authority.enabled && !failed
      ? (query.data?.items.filter(
          (division) =>
            division.active === active &&
            division.name
              .toLocaleLowerCase()
              .includes(search.trim().toLocaleLowerCase()),
        ) ?? [])
      : [];
  const FeedbackLayout = isAccessLoading(authority) ? PageContent : ScreenState;
  const blockingState = !authority.enabled ? (
    <AccessFeedback {...authority} loadingContent={<DivisionsLoading />} />
  ) : undefined;

  /** Rereads the current catalogue without changing criteria or replaying commands. */
  function refresh() {
    return query.refetch({ cancelRefetch: false });
  }

  /** Explains a successfully read empty catalogue without changing its criteria. */
  function renderEmptyDivisions() {
    /** Explains whether the successful empty result came from search or the selected activity filter. */
    function emptyDivisionTitle() {
      if (search.trim()) {
        return "Aucune division ne correspond à votre recherche.";
      }
      if (active) {
        return "Aucune division active";
      }
      return "Aucune division inactive";
    }

    return (
      <EmptyState title={emptyDivisionTitle()}>
        {search.trim() ? (
          <Button
            label="Effacer la recherche"
            leadingIcon={Eraser}
            onPress={() => reset(divisionSearchValues())}
          />
        ) : (
          <ReloadButton fetching={query.isFetching} onReload={refresh} />
        )}
      </EmptyState>
    );
  }

  return (
    <Page header={<PageHeader title="Divisions" />}>
      {blockingState ? (
        <PageScrollView>
          <FeedbackLayout>{blockingState}</FeedbackLayout>
        </PageScrollView>
      ) : (
        <PageFlatList
          alwaysBounceVertical={items.length > 0 && !failed}
          refreshControl={
            query.data &&
            items.length > 0 &&
            !failed &&
            authority.sessionStatus === "authenticated" ? (
              <DataRefreshControl
                onRefresh={refresh}
                fetching={query.isFetching}
              />
            ) : undefined
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          data={items}
          keyExtractor={(division) => division.id}
          contentContainerStyle={items.length ? pageContentStyle : styles.list}
          ItemSeparatorComponent={ListSeparator}
          ListFooterComponent={BottomContentSpacer}
          ListHeaderComponent={
            <View
              style={[styles.controls, !items.length && styles.emptyControls]}
            >
              <View style={styles.toolbar}>
                <View style={styles.search}>
                  <Controller
                    control={control}
                    name="search"
                    render={({ field, fieldState }) => (
                      <SearchField
                        ref={field.ref}
                        label="Rechercher une division"
                        placeholder="Rechercher une division…"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        onClear={() => reset(divisionSearchValues())}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </View>
                {authority.permissions?.manageDivisionLifecycle === true && (
                  <View
                    style={[
                      styles.add,
                      {
                        backgroundColor: colors.raised,
                      },
                    ]}
                  >
                    <IconButton
                      label="Créer une division"
                      size="control"
                      onPress={() =>
                        router.push("/administration/divisions/new")
                      }
                    >
                      <Plus
                        accessible={false}
                        size={tokens.size.icon.lg}
                        color={colors.icon}
                      />
                    </IconButton>
                    <View
                      pointerEvents="none"
                      accessible={false}
                      style={[styles.addBorder, { borderColor: colors.border }]}
                    />
                  </View>
                )}
              </View>
              <View style={styles.filters}>
                {[true, false].map((value) => (
                  <Pressable
                    key={String(value)}
                    accessibilityRole="tab"
                    accessibilityLabel={value ? "Actives" : "Inactives"}
                    accessibilityState={{ selected: active === value }}
                    onPress={() => setActive(value)}
                    style={styles.filterTarget}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.filter,
                          {
                            backgroundColor:
                              active === value
                                ? membership.fill
                                : colors.subtle,
                            borderColor:
                              active === value
                                ? membership.border
                                : colors.border,
                            opacity: pressed ? tokens.opacity.pressed : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            tokens.typography.metadata,
                            {
                              color:
                                active === value
                                  ? membership.content
                                  : colors.secondaryText,
                            },
                          ]}
                        >
                          {value ? "Actives" : "Inactives"}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={
            failed ? (
              <ScreenState>
                <ReadFeedback
                  query={query}
                  loadingContent={<DivisionsLoading />}
                />
              </ScreenState>
            ) : query.isPending ? (
              <PageContent>
                <ReadFeedback
                  query={query}
                  loadingContent={<DivisionsLoading />}
                />
              </PageContent>
            ) : (
              <ScreenState>{renderEmptyDivisions()}</ScreenState>
            )
          }
          renderItem={({ item }) => (
            <DivisionCard
              division={item}
              canEdit={canEdit}
              onPress={() =>
                router.push({
                  pathname: "/administration/divisions/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}
    </Page>
  );
}

/** A row opens the single editor; presentation artwork remains a protected, generated binary read. */
function DivisionCard({
  division,
  canEdit,
  onPress,
}: Readonly<{
  division: DivisionResponse;
  canEdit: boolean;
  onPress: () => void;
}>) {
  const { colors } = useTheme();
  const artwork = usePresentationLogo(
    { kind: "division", id: division.id },
    "effective",
    division.logo.effectiveUrl != null,
  );
  return (
    <Pressable
      accessibilityRole={canEdit ? "link" : undefined}
      accessibilityLabel={division.name}
      disabled={!canEdit}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: `${division.color}${colors.contextBorderAlpha}`,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <View style={styles.artwork}>
        <DivisionPaint division={division} />
        <SportingMedia
          key={artwork.dataUpdatedAt}
          identity={division}
          kind="division"
          size={52}
          uri={artwork.data ?? undefined}
          loading={!!division.logo.effectiveUrl && artwork.isLoading}
          error={!!division.logo.effectiveUrl && artwork.isError}
        />
      </View>
      <View style={styles.identity}>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          {division.name}
        </Text>
        <View style={styles.swatches}>
          {(
            division.gradient ?? [
              division.color,
              division.color,
              division.color,
            ]
          ).map((color, index) => (
            <View
              key={index}
              style={[styles.swatch, { backgroundColor: color }]}
            />
          ))}
        </View>
      </View>
      {canEdit && (
        <ChevronRight accessible={false} size={18} color={colors.icon} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1 },
  controls: { gap: tokens.spacing.lg, marginBottom: tokens.spacing["2xl"] },
  // Empty feedback owns its own content inset; controls must not add another trailing reserve.
  emptyControls: {
    paddingHorizontal: tokens.spacing.screen,
    paddingTop: tokens.layout.content.start,
    marginBottom: 0,
  },
  toolbar: { flexDirection: "row", gap: tokens.spacing.sm },
  search: { flex: 1, minWidth: 0 },
  add: {
    width: tokens.size.control.default,
    minHeight: tokens.size.control.default,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.control,
  },
  addBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
  },
  // Activity chips change results within the same catalogue.
  filters: { flexDirection: "row", gap: tokens.spacing.sm },
  filterTarget: {
    minHeight: tokens.touch.minimum,
    justifyContent: "center",
  },
  filter: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.md,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.full,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
    minHeight: 116,
    paddingRight: tokens.spacing.lg,
    overflow: "hidden",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
  },
  artwork: {
    width: 76,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    flex: 1,
    gap: tokens.spacing.xl,
    paddingVertical: tokens.spacing.lg,
  },
  swatches: { flexDirection: "row", gap: tokens.spacing.xs },
  swatch: { width: 14, height: 14, borderRadius: tokens.spacing.xs },
});
