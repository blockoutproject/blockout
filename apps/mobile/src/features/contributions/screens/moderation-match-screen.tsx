import { useNavigation } from "expo-router";
import { hashKey } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { LegendList } from "@legendapp/list/react-native";
import type {
  ModeratedStreamContributionsResponse,
  ModeratedStreamContributionResponse,
  StreamModerationActionEnum,
} from "../../../../.generated/schemas/index.zod";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { ListSeparator } from "../../../shared/components/list-separator";
import { ListContinuation } from "../../../shared/components/list-continuation";
import {
  Page,
  PageScrollView,
  pageContentStyle,
} from "../../../shared/components/page";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { PagedTabs } from "../../../shared/components/paged-tabs";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { PageHeader } from "../../../shared/components/page-header";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useModerationMatch, useModerationVersions } from "../api/moderation";
import { ContributionHistory } from "../components/contribution-history";
import { ModerationMatchContext } from "../components/moderation-match-context";
import { ModerationMatchLoading } from "../components/moderation-loading";
import {
  ModerationPublicationForm,
  type ModerationPublicationFormHandle,
} from "../forms/moderation-publication-form";

/** Exact retained match identity; no public dated F03 wrapper authorizes this private route. */
export interface ModerationMatchScreenProps {
  matchId: string;
}
type Action = StreamModerationActionEnum | "reactivate";
/** A decision takes its editing revision from the same native page that displayed its exact version. */
type Decide = (
  version: ModeratedStreamContributionResponse,
  action: Action,
  revision: string,
  activeUrl?: string,
) => void;

/** Reuses the application's native pager; its retained active scene owns the ordinary address editor. */
export function ModerationMatchScreen({ matchId }: ModerationMatchScreenProps) {
  const [tab, setTab] = useState("active");
  const [confirmed, setConfirmed] = useState(false);
  const editing = useModerationMatch(matchId, "active", tab === "active");
  const pending = useModerationVersions(matchId, "pending", tab === "pending");
  const historical = useModerationVersions(
    matchId,
    "historical",
    tab === "historical",
  );
  const selected =
    tab === "pending" ? pending : tab === "historical" ? historical : editing;
  const current =
    selected.canRetain && !isAccessDenied(selected.query.error)
      ? (selected.query.data?.pages[0] ?? editing.query.data?.pages[0])
      : undefined;
  const activeCurrent =
    editing.canRetain && !isAccessDenied(editing.query.error)
      ? editing.query.data?.pages[0]
      : undefined;
  const feedback = useActionFeedback();
  const confirmation = useActionConfirmation();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const busy =
    !editing.allowed ||
    editing.change.isPending ||
    editing.reactivate.isPending ||
    editing.publish.isPending;
  /** Captures exact target, original actor and the displayed page revision before native confirmation. */
  async function decide(
    version: ModeratedStreamContributionResponse,
    action: Action,
    revision: string,
    activeUrl?: string,
  ) {
    const actorAccountId = editing.session.accountId;
    if (!actorAccountId || busy) return;
    const label = {
      approve: "Approuver",
      reject: "Refuser",
      withdraw: "Retirer",
      reactivate: "Réactiver",
    }[action];
    const selected = await confirmation({
      title: `${label} ce lien ?`,
      message: `${version.url}${(action === "approve" || action === "reactivate") && activeUrl ? `\n\nLien remplacé : ${activeUrl}` : ""}`,
      confirmLabel: label,
      destructive: action === "reject" || action === "withdraw",
    });
    if (!selected || !mounted.current) return;
    feedback.clear();
    try {
      if (action === "reactivate")
        await editing.reactivate.mutateAsync({
          versionId: version.id,
          body: { actorAccountId, revision },
        });
      else
        await editing.change.mutateAsync({
          versionId: version.id,
          body: { actorAccountId, revision, action },
        });
      if (mounted.current) setConfirmed(true);
    } catch {
      if (mounted.current)
        feedback.error(
          "La décision n’a pas pu être confirmée. Actualisez avant une nouvelle décision.",
        );
    }
  }
  return (
    <Page>
      <PagedTabs
        selected={tab}
        onSelect={setTab}
        header={<PageHeader title="Liens du match" />}
        tabs={[
          {
            id: "active",
            label: "Actif",
            content: (
              <ActiveScene
                matchId={matchId}
                editing={editing}
                active={tab === "active"}
                current={activeCurrent}
                busy={busy}
                onAction={decide}
                confirmed={confirmed}
                onSuccess={() => setConfirmed(true)}
              />
            ),
          },
          {
            id: "pending",
            label: current
              ? `Propositions (${current.counts.pending})`
              : "Propositions",
            content: (
              <VersionScene
                matchId={matchId}
                state="pending"
                reading={pending}
                confirmed={confirmed}
                active={tab === "pending"}
                busy={busy}
                onAction={decide}
                refreshContext={editing.refresh}
              />
            ),
          },
          {
            id: "historical",
            label: "Historique",
            content: (
              <VersionScene
                matchId={matchId}
                state="historical"
                reading={historical}
                confirmed={confirmed}
                active={tab === "historical"}
                busy={busy}
                onAction={decide}
                refreshContext={editing.refresh}
              />
            ),
          },
        ]}
      />
    </Page>
  );
}

/** The stable active tab retains RHF input across native tab switches and ordinary read outages. */
function ActiveScene({
  matchId,
  active,
  editing,
  current,
  busy,
  onAction,
  onSuccess,
  confirmed,
}: {
  matchId: string;
  active: boolean;
  editing: ReturnType<typeof useModerationMatch>;
  current: ModeratedStreamContributionsResponse | undefined;
  busy: boolean;
  onAction: Decide;
  onSuccess: () => void;
  confirmed: boolean;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const form = useRef<ModerationPublicationFormHandle>(null);
  const { colors } = useTheme();
  const feedback = useActionFeedback();
  /** Refreshes published context and any open reports while retaining the mounted editor on outages. */
  async function refresh() {
    if (refreshing || !active || busy) return;
    feedback.clear();
    setRefreshing(true);
    try {
      await (form.current ? form.current.refresh() : editing.refresh());
    } catch {
      feedback.error();
    } finally {
      setRefreshing(false);
    }
  }
  if (
    !current &&
    (editing.profile.isPending || (editing.allowed && editing.query.isPending))
  )
    return (
      <PageScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={pageContentStyle}>
          <ModerationMatchLoading editor />
        </View>
      </PageScrollView>
    );
  if (!current)
    return (
      <PageScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ScreenState>
          {!editing.canRetain && editing.profile.isSuccess ? (
            <Text style={[tokens.typography.body, { color: colors.text }]}>
              La modération des liens vidéo n’est pas autorisée.
            </Text>
          ) : (
            <ReadFeedback
              query={
                editing.profile.isError || editing.profile.isPending
                  ? editing.profile
                  : editing.query
              }
            />
          )}
        </ScreenState>
      </PageScrollView>
    );
  const published = current.activeContribution;
  return (
    <FormScrollView
      contentContainerStyle={pageContentStyle}
      refreshControl={
        <DataRefreshControl
          enabled={active && !busy}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
        />
      }
    >
      <View style={styles.header}>
        {confirmed && (
          <Text
            accessibilityLiveRegion="polite"
            style={[tokens.typography.strong, { color: colors.text }]}
          >
            Décision confirmée
          </Text>
        )}
        {editing.profile.isError && (
          <Button
            label="Réessayer le profil"
            loading={editing.profile.isFetching}
            onPress={() => void editing.profile.refetch()}
          />
        )}
        <ModerationMatchContext match={current.match} />

        {!published && (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Aucun lien actif
          </Text>
        )}
        {(published || current.canPublish) && (
          <ModerationPublicationForm
            ref={form}
            current={current}
            editing={editing}
            onWithdraw={() => {
              if (published) onAction(published, "withdraw", current.revision);
            }}
            onSuccess={onSuccess}
          >
            {published && (
              <ContributionHistory
                key={published.id}
                matchId={matchId}
                contribution={published}
                detailsOnly
                busy={busy}
              />
            )}
          </ModerationPublicationForm>
        )}
      </View>
    </FormScrollView>
  );
}

/** Each proposal/history scene retains its native list and explicit continuation footer independently. */
function VersionScene({
  matchId,
  state,
  reading,
  confirmed,
  active,
  busy,
  onAction,
  refreshContext,
}: {
  matchId: string;
  state: "pending" | "historical";
  reading: ReturnType<typeof useModerationVersions>;
  confirmed: boolean;
  active: boolean;
  busy: boolean;
  onAction: Decide;
  refreshContext: () => Promise<unknown>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const { query } = reading;
  const current =
    reading.canRetain && !isAccessDenied(query.error)
      ? query.data?.pages[0]
      : undefined;
  const rows = current
    ? [
        ...new Map(
          (query.data?.pages ?? [])
            .flatMap((page) => page.items)
            .map((item) => [item.id, item]),
        ).values(),
      ]
    : [];
  const navigation = useNavigation();
  const identity = hashKey([
    reading.session.subject,
    reading.session.accountId,
    matchId,
    state,
  ]);
  const currentScene = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    currentScene.current = active && reading.allowed ? identity : undefined;
    return () => {
      currentScene.current = undefined;
    };
  }, [active, reading.allowed, identity]);
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  /** Rereads this traversal and shared active context; independent read failures never discard authorized rows. */
  async function refresh() {
    if (refreshing || !active || busy) return;
    feedback.clear();
    setRefreshing(true);
    try {
      const results = await Promise.allSettled([
        reading.refresh(),
        refreshContext(),
      ]);
      if (
        currentScene.current === identity &&
        navigation.isFocused() &&
        results.some((result) => result.status === "rejected")
      )
        feedback.error();
    } finally {
      setRefreshing(false);
    }
  }
  /** Only the current scene may report a late continuation failure; its footer retries the original cursor. */
  async function more() {
    if (
      !active ||
      refreshing ||
      !navigation.isFocused() ||
      AppState.currentState !== "active" ||
      busy ||
      !reading.allowed ||
      !query.hasNextPage ||
      query.isFetching ||
      (query.isError && !query.isFetchNextPageError)
    )
      return;
    feedback.clear();
    const result = await query.fetchNextPage({ cancelRefetch: false });
    if (
      result.isFetchNextPageError &&
      navigation.isFocused() &&
      currentScene.current === identity
    )
      feedback.error();
  }
  if (
    !current &&
    (reading.profile.isPending || (reading.allowed && query.isPending))
  )
    return (
      <PageScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={pageContentStyle}>
          <ModerationMatchLoading />
        </View>
      </PageScrollView>
    );
  if (!current)
    return (
      <PageScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ScreenState>
          {!reading.canRetain && reading.profile.isSuccess ? (
            <Text style={[tokens.typography.body, { color: colors.text }]}>
              La modération des liens vidéo n’est pas autorisée.
            </Text>
          ) : (
            <ReadFeedback
              query={
                reading.profile.isError || reading.profile.isPending
                  ? reading.profile
                  : query
              }
            />
          )}
        </ScreenState>
      </PageScrollView>
    );
  return (
    <LegendList
      key={identity}
      {...hiddenScrollIndicators}
      recycleItems={false}
      accessibilityLabel={
        state === "pending" ? "Propositions de liens" : "Historique des liens"
      }
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={pageContentStyle}
      ItemSeparatorComponent={ListSeparator}
      onEndReached={() => {
        if (!query.isError) void more();
      }}
      refreshControl={
        <DataRefreshControl
          enabled={active && !busy}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {confirmed && (
            <Text
              accessibilityLiveRegion="polite"
              style={[tokens.typography.strong, { color: colors.text }]}
            >
              Décision confirmée
            </Text>
          )}
          {reading.profile.isError && (
            <Button
              label="Réessayer le profil"
              loading={reading.profile.isFetching}
              onPress={() => void reading.profile.refetch()}
            />
          )}
          <ModerationMatchContext match={current.match} />
        </View>
      }
      renderItem={({ item }) => (
        <ContributionHistory
          key={item.id}
          matchId={matchId}
          contribution={item}
          historical={state === "historical"}
          busy={busy}
          onAction={(version, action) =>
            onAction(
              version,
              action,
              current.revision,
              current.activeContribution?.url,
            )
          }
        />
      )}
      ListEmptyComponent={
        <ScreenState>
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Aucune version dans cette sélection
          </Text>
        </ScreenState>
      }
      ListFooterComponent={
        <>
          <ListContinuation
            loading={query.isFetchingNextPage}
            failed={query.isFetchNextPageError}
            disabled={!active || query.isFetching || busy}
            onRetry={() => void more()}
          />
          <BottomContentSpacer />
        </>
      }
    />
  );
}
const styles = StyleSheet.create({
  header: {
    gap: tokens.layout.list.gap,
    paddingBottom: tokens.layout.list.gap,
  },
});
