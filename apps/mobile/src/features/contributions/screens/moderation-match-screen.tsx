import { useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  Platform,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
} from "react-native";
import {
  KeyboardProvider,
  KeyboardAwareScrollView,
} from "react-native-keyboard-controller";
import Animated from "react-native-reanimated";
import type {
  ModeratedStreamContributionResponse,
  StreamModerationActionEnum,
  StreamVersionFilterEnum,
} from "../../../../.generated/schemas/index.zod";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Page, pageContentStyle } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { Tabs } from "../../../shared/components/tabs";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { useModerationMatch } from "../api/moderation";
import { ContributionHistory } from "../components/contribution-history";
import { ModerationMatchContext } from "../components/moderation-match-context";
import { ModerationPublicationForm } from "../forms/moderation-publication-form";

/** Exact retained match identity; no public F03 wrapper authorizes this private route. */
export interface ModerationMatchScreenProps {
  matchId: string;
}
/** Current active link, native paged proposals/history and explicit exact-version moderator decisions. */
export function ModerationMatchScreen({ matchId }: ModerationMatchScreenProps) {
  const [tab, setTab] = useState("active");
  const [publication, setPublication] = useState<{
    revision: string;
    activeUrl?: string;
  }>();
  const [confirmed, setConfirmed] = useState(false);
  const filter: StreamVersionFilterEnum | undefined =
    tab === "pending"
      ? "pending"
      : tab === "historical"
        ? "historical"
        : "active";
  const editing = useModerationMatch(matchId, filter);
  const { query } = editing;
  const { colors } = useTheme();
  const feedback = useActionFeedback();
  const confirmation = useActionConfirmation();
  const navigation = useNavigation();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = editing.allowed ? query.data?.pages[0] : undefined;
  const busy =
    editing.change.isPending ||
    editing.reactivate.isPending ||
    editing.publish.isPending;
  const rows =
    tab === "active"
      ? []
      : [
          ...new Map(
            (query.data?.pages ?? [])
              .flatMap((page) => page.items)
              .map((item) => [item.id, item]),
          ).values(),
        ];
  /** A normal refresh starts at page zero and keeps the mounted publication draft on failure. */
  async function refresh() {
    try {
      await editing.refresh();
    } catch {
      if (mounted.current) feedback.error();
    }
  }
  /** Continues only the visible native page traversal; an ordinary error remains retryable. */
  async function more() {
    if (
      !navigation.isFocused() ||
      AppState.currentState !== "active" ||
      !query.hasNextPage ||
      query.isFetching ||
      busy
    )
      return;
    const next = await query.fetchNextPage({ cancelRefetch: false });
    if (next.isFetchNextPageError && mounted.current) feedback.error();
  }
  /** Captures only the explicit editor's initial values; paged remote context stays in Query. */
  function openPublication() {
    if (current?.canPublish)
      setPublication({
        revision: current.revision,
        activeUrl: current.activeContribution?.url,
      });
  }
  /** Captures the exact target, original actor and viewed revision before native confirmation. */
  async function decide(
    version: ModeratedStreamContributionResponse,
    action: StreamModerationActionEnum | "reactivate",
  ) {
    const actorAccountId = editing.session.accountId;
    if (!current || !actorAccountId || !editing.allowed || busy) return;
    const revision = current.revision;
    const label = {
      approve: "Approuver",
      reject: "Refuser",
      withdraw: "Retirer",
      reactivate: "Réactiver",
    }[action];
    const selected = await confirmation({
      title: `${label} ce lien ?`,
      message: `${version.url}${(action === "approve" || action === "reactivate") && current.activeContribution ? `\n\nLien remplacé : ${current.activeContribution.url}` : ""}`,
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
  const content = (
    <Page edges={["left", "right"]}>
      <ScrollChrome header={<PageHeader title="Liens du match" />}>
        {({ onScroll, headerHeight }) => (
          <Animated.FlatList
            {...hiddenScrollIndicators}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            keyboardShouldPersistTaps="handled"
            renderScrollComponent={
              Platform.OS === "android"
                ? renderModerationKeyboardScroll
                : undefined
            }
            data={current ? rows : []}
            keyExtractor={(item) => item.id}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[
              pageContentStyle,
              {
                paddingTop: headerHeight + tokens.layout.content.start,
                gap: tokens.spacing.md,
              },
            ]}
            refreshControl={
              <DataRefreshControl
                refreshing={query.isRefetching}
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
                {!editing.allowed &&
                (editing.profile.isSuccess ||
                  editing.session.status === "guest") ? (
                  <Text
                    style={[tokens.typography.body, { color: colors.text }]}
                  >
                    La modération des liens vidéo n’est pas autorisée.
                  </Text>
                ) : !current ? (
                  <ReadFeedback
                    query={
                      editing.profile.isError || editing.profile.isPending
                        ? editing.profile
                        : query
                    }
                  />
                ) : (
                  <>
                    <ModerationMatchContext match={current.match} />
                    <Tabs
                      items={[
                        { id: "active", label: "Actif" },
                        {
                          id: "pending",
                          label: `Propositions (${current.counts.pending})`,
                        },
                        { id: "historical", label: "Historique" },
                      ]}
                      selected={tab}
                      onSelect={setTab}
                    />
                    {current.approvalRequiredAfterReports && (
                      <Text
                        style={[
                          tokens.typography.body,
                          { color: colors.secondaryText },
                        ]}
                      >
                        Une validation reste nécessaire après les signalements.
                      </Text>
                    )}
                    {tab === "active" &&
                      (current.activeContribution ? (
                        <ContributionHistory
                          matchId={matchId}
                          contribution={current.activeContribution}
                          busy={busy}
                          onAction={(version, action) =>
                            void decide(version, action)
                          }
                          onReplace={
                            current.canPublish ? openPublication : undefined
                          }
                        />
                      ) : (
                        <Text
                          style={[
                            tokens.typography.body,
                            { color: colors.secondaryText },
                          ]}
                        >
                          Aucun lien actif
                        </Text>
                      ))}
                    {tab === "active" &&
                      !current.activeContribution &&
                      current.canPublish &&
                      !publication && (
                        <Button
                          label="Publier un lien"
                          onPress={openPublication}
                        />
                      )}
                  </>
                )}
                {publication &&
                  editing.allowed &&
                  !isAccessDenied(query.error) && (
                    <ModerationPublicationForm
                      initial={publication}
                      canPublish={current?.canPublish === true}
                      editing={editing}
                      onClose={() => setPublication(undefined)}
                      onSuccess={() => {
                        setConfirmed(true);
                        setPublication(undefined);
                      }}
                    />
                  )}
              </View>
            }
            renderItem={({ item }) => (
              <ContributionHistory
                matchId={matchId}
                contribution={item}
                historical={tab === "historical"}
                busy={busy}
                onAction={(version, action) => void decide(version, action)}
              />
            )}
            ListEmptyComponent={
              current && tab !== "active" ? (
                <Text
                  style={[
                    tokens.typography.body,
                    { color: colors.secondaryText },
                  ]}
                >
                  Aucune version dans cette sélection
                </Text>
              ) : undefined
            }
            ListFooterComponent={
              <View style={styles.header}>
                {query.hasNextPage && tab !== "active" && (
                  <Button
                    label="Versions suivantes"
                    variant="secondary"
                    loading={query.isFetchingNextPage}
                    onPress={() => void more()}
                  />
                )}
                <BottomContentSpacer />
              </View>
            }
          />
        )}
      </ScrollChrome>
    </Page>
  );
  return Platform.OS === "android" ? (
    <KeyboardProvider>{content}</KeyboardProvider>
  ) : (
    content
  );
}
/** Integrates the installed native keyboard owner with the one virtualized moderation list. */
function renderModerationKeyboardScroll(props: ScrollViewProps) {
  return <KeyboardAwareScrollView {...props} />;
}
const styles = StyleSheet.create({ header: { gap: tokens.spacing.md } });
