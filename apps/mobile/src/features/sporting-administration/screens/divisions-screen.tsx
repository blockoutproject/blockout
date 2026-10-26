import { ListSeparator } from "../../../shared/components/list-separator";
import { AccessFeedback } from "../../access/components/access-feedback";
import { PageHeader } from "../../../shared/components/page-header";
import {
  Page,
  PageScrollView,
  pageContentStyle,
} from "../../../shared/components/page";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { DivisionResponse } from "../../../../.generated/schemas/index.zod";
import { IconButton } from "../../../shared/components/icon-button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { SearchField } from "../../../shared/components/search-field";

import { DivisionsLoading } from "../components/divisions-loading";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useDivisions } from "../api/classification";
import { usePresentationLogo } from "../api/presentation";
import { DivisionPaint } from "../../sporting/components/division-paint";
import { SportingMedia } from "../../sporting/components/sporting-media";

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
  const denied = isAccessDenied(query.error);
  const items =
    authority.enabled && !denied
      ? (query.data?.items.filter(
          (division) =>
            division.active === active &&
            division.name
              .toLocaleLowerCase()
              .includes(search.trim().toLocaleLowerCase()),
        ) ?? [])
      : [];
  const feedback = useActionFeedback();
  const blockingState = !authority.enabled ? (
    <AccessFeedback {...authority} />
  ) : undefined;
  return (
    <Page>
      <PageHeader title="Divisions" />
      {blockingState ? (
        <PageScrollView
          refreshControl={
            authority.sessionStatus === "authenticated" ? (
              <DataRefreshControl
                refreshing={authority.account.isRefetching}
                onRefresh={() =>
                  void authority.account.refetch().then((result) => {
                    if (
                      result.isError &&
                      result.data &&
                      !isAccessDenied(result.error)
                    )
                      feedback.error();
                  })
                }
              />
            ) : undefined
          }
        >
          <ScreenState>{blockingState}</ScreenState>
        </PageScrollView>
      ) : (
        <>
          <FlatList
            alwaysBounceVertical
            refreshControl={
              authority.sessionStatus === "authenticated" ? (
                <DataRefreshControl
                  refreshing={
                    query.isRefetching || authority.account.isRefetching
                  }
                  onRefresh={() => {
                    if (authority.enabled)
                      void query.refetch().then((result) => {
                        if (
                          result.isError &&
                          result.data &&
                          !isAccessDenied(result.error)
                        )
                          feedback.error();
                      });
                    else
                      void authority.account.refetch().then((result) => {
                        if (
                          result.isError &&
                          result.data &&
                          !isAccessDenied(result.error)
                        )
                          feedback.error();
                      });
                  }}
                />
              ) : undefined
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            data={items}
            keyExtractor={(division) => division.id}
            contentContainerStyle={
              items.length ? pageContentStyle : styles.list
            }
            ItemSeparatorComponent={ListSeparator}
            ListHeaderComponent={
              <View
                style={[!items.length && pageContentStyle, styles.controls]}
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
                        style={[
                          styles.addBorder,
                          { borderColor: colors.border },
                        ]}
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
              query.isPending && !denied ? (
                <View style={pageContentStyle}>
                  <DivisionsLoading />
                </View>
              ) : (
                <ScreenState>
                  {denied ? (
                    <ErrorState
                      onRetry={() => void query.refetch()}
                      retrying={query.isFetching}
                    />
                  ) : query.isError && !query.data ? (
                    <ErrorState
                      onRetry={() =>
                        void query.refetch().then((result) => {
                          if (
                            result.isError &&
                            result.data &&
                            !isAccessDenied(result.error)
                          )
                            feedback.error();
                        })
                      }
                      retrying={query.isFetching}
                    />
                  ) : (
                    <EmptyState
                      title={
                        search.trim()
                          ? "Aucune division ne correspond à votre recherche."
                          : active
                            ? "Aucune division active"
                            : "Aucune division inactive"
                      }
                    />
                  )}
                </ScreenState>
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
        </>
      )}
    </Page>
  );
}
/** A row opens the single editor; presentation artwork remains a protected, generated binary read. */
function DivisionCard({
  division,
  canEdit,
  onPress,
}: {
  division: DivisionResponse;
  canEdit: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const artwork = usePresentationLogo(
    { kind: "division", id: division.id },
    "effective",
    division.logo.effectiveUrl != null,
    division.revision,
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
          borderColor: `${division.color}${tokens.sporting.borderAlpha}`,
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
  // Activity chips filter one catalogue; resource-section navigation uses the shared Tabs rail.
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
