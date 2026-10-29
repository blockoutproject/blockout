import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import type {
  OwnStreamContributionResponse,
  StreamContributionStateEnum,
  StreamOwnerActionEnum,
} from "../../../../.generated/schemas/index.zod";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { Page, pageContentStyle } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { Button } from "../../../shared/components/button";
import { IconButton } from "../../../shared/components/icon-button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { ErrorState } from "../../../shared/components/state-card";
import { Surface } from "../../../shared/components/surface";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { EntryGroupSeparator } from "../../../shared/components/entry-group";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import {
  MatchSummary,
  useConsultationQueries,
} from "../../sporting/match-consultation";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import {
  isOwnContributionAccessDenied,
  useOwnContributions,
} from "../api/own-contributions";

/** One match's personal proposals; the original-account read supplies permissions and sporting refusal revokes retained details. */
export interface OwnContributionsScreenProps {
  matchId: string;
}

/** French lifecycle explanations reveal neither other proposals nor private moderation reasons. */
const states: Record<
  StreamContributionStateEnum,
  { title: string; explanation: string }
> = {
  active: {
    title: "Publié",
    explanation:
      "Ce lien reste disponible tant que les conditions du match le permettent.",
  },
  pending: {
    title: "En attente de validation",
    explanation:
      "Cette proposition attend une décision. Un éventuel lien actif est conservé tant qu’il reste autorisé.",
  },
  rejected: {
    title: "Proposition refusée",
    explanation:
      "Cette proposition n’a pas été retenue. Le lien actif n’est pas retiré par ce refus.",
  },
  cancelled: {
    title: "Proposition annulée",
    explanation:
      "Cette proposition a été annulée. Aucun quota consommé n’est restitué.",
  },
  withdrawn: {
    title: "Lien retiré",
    explanation:
      "Cette version a été retirée. Une éventuelle proposition reste indépendante.",
  },
  hidden: {
    title: "Lien masqué",
    explanation:
      "Cette version n’est plus visible. Une intervention de modération est nécessaire.",
  },
  replaced: {
    title: "Ancien lien remplacé",
    explanation: "Une autre version a remplacé ce lien.",
  },
  superseded: {
    title: "Proposition remplacée",
    explanation:
      "Une autre proposition a été retenue ou une nouvelle version a été soumise. Les détails des autres personnes restent privés.",
  },
};

/** Native proposals and exact-version confirmations share the existing Query command family and submission form. */
export function OwnContributionsScreen({
  matchId,
}: OwnContributionsScreenProps) {
  const editing = useOwnContributions(matchId);
  const match = useQuery(useConsultationQueries().match(matchId));
  const router = useRouter();
  const navigation = useNavigation();
  const feedback = useActionFeedback();
  const confirmAction = useActionConfirmation();
  const { colors } = useTheme();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { query, change, session } = editing;
  const current = query.data?.pages[0];
  const stale = query.isError && !query.isFetchNextPageError;
  const authorized =
    editing.canRetain &&
    !isOwnContributionAccessDenied(query.error) &&
    !isOwnContributionAccessDenied(match.error);
  const rows = authorized
    ? [
        ...new Map(
          (query.data?.pages ?? [])
            .flatMap((page) => page.items)
            .map((item) => [item.id, item]),
        ).values(),
      ]
    : [];
  const active = rows.find((item) => item.state === "active");
  const disabled =
    !authorized ||
    !editing.usable ||
    query.isError ||
    query.isFetching ||
    change.pending ||
    change.needsRead;

  /** Opens the existing new-version editor; the submitted address never mutates a historical version. */
  function propose() {
    if (disabled || !current?.eligibility.canSubmit) return;
    router.push({
      pathname: "/matches/[matchId]/contribution",
      params: { matchId },
    });
  }
  /** Rereads displayed context and personal history together; an ordinary failure preserves their authorized data. */
  async function refresh() {
    if (change.isPending()) return;
    feedback.clear();
    const results = await Promise.allSettled([
      editing.refresh(),
      match.refetch({ throwOnError: true }),
    ]);
    if (
      mounted.current &&
      session.isCurrent(session.generation) &&
      results.some((result) => result.status === "rejected")
    )
      feedback.error();
  }
  /** Observes current context once after uncertainty, conflict or refusal; no command is replayed. */
  async function reread() {
    try {
      const { reconciled } = await editing.reread();
      if (
        mounted.current &&
        session.isCurrent(session.generation) &&
        !reconciled
      )
        feedback.error();
    } catch {
      if (mounted.current && session.isCurrent(session.generation))
        feedback.error();
    }
  }
  /** Executes the exact captured target and revision after native confirmation, with no age or quota gate. */
  async function changeVersion(
    versionId: string,
    revision: string,
    action: StreamOwnerActionEnum,
  ) {
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    feedback.clear();
    const attempt = change.start({ versionId, body: { action, revision } });
    if (!attempt) return;
    try {
      await attempt;
    } catch (error) {
      if (!mounted.current || !session.isCurrent(session.generation)) return;
      if (requiresRevisionRead(error) || isOwnContributionAccessDenied(error))
        await reread();
      else
        feedback.error(
          "La modification est indisponible. Relisez votre contribution avant de réessayer.",
        );
    }
  }
  /** Awaits one native decision for the viewed version, then rechecks the original session before dispatch. */
  async function confirm(
    item: OwnStreamContributionResponse,
    action: StreamOwnerActionEnum,
  ) {
    if (
      disabled ||
      !current ||
      !(action === "cancel" ? item.canCancel : item.canWithdraw)
    )
      return;
    const revision = current.revision;
    const accepted = await confirmAction({
      title:
        action === "cancel"
          ? "Annuler cette proposition ?"
          : "Retirer ce lien ?",
      message: `${item.url}\n\n${action === "cancel" ? "L’annulation ne retire aucun lien actif." : "Seule cette version est retirée. Votre proposition éventuelle reste en attente."} Cette action ne restitue aucun quota consommé.`,
      cancelLabel: "Conserver",
      confirmLabel:
        action === "cancel" ? "Annuler la proposition" : "Retirer le lien",
      destructive: true,
    });
    if (accepted) await changeVersion(item.id, revision, action);
  }
  /** Continues the same native page traversal; failed continuations wait for the explicit footer retry. */
  async function loadMore() {
    if (
      !navigation.isFocused() ||
      AppState.currentState !== "active" ||
      !authorized ||
      !query.hasNextPage ||
      query.isFetching ||
      change.pending ||
      (query.isError && !query.isFetchNextPageError)
    )
      return;
    feedback.clear();
    const result = await query.fetchNextPage({ cancelRefetch: false });
    if (
      mounted.current &&
      session.isCurrent(session.generation) &&
      result.isError &&
      navigation.isFocused() &&
      AppState.currentState === "active"
    )
      feedback.error();
  }

  return (
    <Page edges={["left", "right"]}>
      <ScrollChrome header={<PageHeader title="Lien de diffusion" />}>
        {({ onScroll, headerHeight }) => (
          <Animated.FlatList
            {...hiddenScrollIndicators}
            accessibilityLabel="Liste de mes propositions"
            alwaysBounceVertical={authorized && !!current}
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={[
              pageContentStyle,
              { paddingTop: headerHeight + tokens.layout.content.start },
            ]}
            data={rows}
            keyExtractor={(item) => item.id}
            onEndReached={() => {
              if (!query.isError) void loadMore();
            }}
            ItemSeparatorComponent={EntryGroupSeparator}
            refreshControl={
              authorized && current ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  enabled={!change.pending}
                  refreshing={query.isRefetching || match.isRefetching}
                  onRefresh={() => void refresh()}
                />
              ) : undefined
            }
            ListHeaderComponent={
              <View style={styles.header}>
                {authorized && current && match.data && (
                  <MatchSummary
                    match={match.data.match}
                    presentation="context"
                  />
                )}
                {session.status === "guest" ? (
                  <ScreenState>
                    <Button
                      label="Se connecter"
                      onPress={() =>
                        router.push({
                          pathname: "/sign-in-invitation",
                          params: { reason: "contribution" },
                        })
                      }
                    />
                  </ScreenState>
                ) : session.status !== "authenticated" ? (
                  <ScreenState>
                    {session.status === "restoring" || session.operation ? (
                      <RequestLoading />
                    ) : (
                      <Button
                        label="Se connecter"
                        onPress={() => router.push("/sign-in")}
                      />
                    )}
                  </ScreenState>
                ) : !editing.profile.data ? (
                  <ScreenState>
                    <ReadFeedback query={editing.profile} />
                  </ScreenState>
                ) : !editing.canRetain ? (
                  <ScreenState>
                    <ErrorState
                      onRetry={() => void editing.profile.refetch()}
                      retrying={editing.profile.isFetching}
                    />
                  </ScreenState>
                ) : !current || !authorized ? (
                  <ScreenState>
                    {query.isError ||
                    isOwnContributionAccessDenied(match.error) ? (
                      <ErrorState
                        onRetry={() => void refresh()}
                        retrying={query.isFetching || match.isFetching}
                      />
                    ) : (
                      <ReadFeedback query={query} />
                    )}
                  </ScreenState>
                ) : (
                  <>
                    {editing.profile.isError && (
                      <Button
                        label="Réessayer le profil"
                        loading={editing.profile.isFetching}
                        onPress={() => void editing.profile.refetch()}
                      />
                    )}
                    {active && (
                      <PublicContribution
                        item={active}
                        stale={stale}
                        disabled={disabled}
                        onWithdraw={() => void confirm(active, "withdraw")}
                        onReplace={
                          current.eligibility.canSubmit ? propose : undefined
                        }
                      />
                    )}
                    {current.eligibility.canSubmit && !active && (
                      <Button
                        label="Proposer un nouveau lien"
                        disabled={disabled}
                        onPress={propose}
                      />
                    )}
                    {!current.eligibility.canSubmit &&
                      current.eligibility.reason && (
                        <Text
                          style={[
                            tokens.typography.body,
                            { color: colors.secondaryText },
                          ]}
                        >
                          {current.eligibility.reason}
                        </Text>
                      )}
                    {change.data && (
                      <Text
                        accessibilityLiveRegion="polite"
                        style={[tokens.typography.body, { color: colors.text }]}
                      >
                        {change.data.contribution.state === "cancelled"
                          ? "L’annulation est confirmée."
                          : "Le retrait est confirmé."}
                      </Text>
                    )}
                    {stale && (
                      <>
                        <Text
                          accessibilityLiveRegion="polite"
                          style={[
                            tokens.typography.body,
                            { color: colors.secondaryText },
                          ]}
                        >
                          L’actualisation a échoué. L’état des versions
                          affichées peut avoir changé. Les modifications déjà
                          confirmées restent enregistrées.
                        </Text>
                        <Button
                          label="Réessayer la lecture"
                          onPress={() => void refresh()}
                          loading={query.isFetching}
                        />
                      </>
                    )}
                    {change.needsRead ? (
                      <>
                        <Text
                          accessibilityLiveRegion="polite"
                          style={[
                            tokens.typography.body,
                            { color: colors.text },
                          ]}
                        >
                          Le résultat doit être vérifié. Relisez l’état courant
                          avant une nouvelle action.
                        </Text>
                        <Button
                          label="Vérifier la contribution"
                          onPress={() => void reread()}
                          loading={query.isFetching}
                        />
                      </>
                    ) : (
                      requiresRevisionRead(change.error) && (
                        <Text
                          accessibilityLiveRegion="polite"
                          style={[
                            tokens.typography.body,
                            { color: colors.text },
                          ]}
                        >
                          L’état courant a été relu. Il ne confirme pas le
                          résultat de la demande précédente. Vérifiez la version
                          avant une nouvelle action.
                        </Text>
                      )
                    )}
                  </>
                )}
                <Text
                  accessibilityRole="header"
                  style={[tokens.typography.heading, { color: colors.text }]}
                >
                  {authorized && current
                    ? `Mes propositions (${current.proposalCount})`
                    : "Mes propositions"}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <ProposalRow
                item={item}
                disabled={disabled}
                onCancel={() => void confirm(item, "cancel")}
              />
            )}
            ListFooterComponent={
              <>
                {authorized && (
                  <ListContinuation
                    loading={query.isFetchingNextPage}
                    failed={query.isFetchNextPageError}
                    disabled={query.isFetching || change.pending}
                    onRetry={() => void loadMore()}
                  />
                )}
                <BottomContentSpacer />
              </>
            }
          />
        )}
      </ScrollChrome>
    </Page>
  );
}

/** The active public version keeps replacement and withdrawal separate from the proposal list. */
interface PublicContributionProps {
  item: OwnStreamContributionResponse;
  disabled: boolean;
  onWithdraw(): void;
  onReplace?: () => void;
  /** An unavailable context refresh cannot present the old public version as the confirmed current one. */
  stale?: boolean;
}
/** Preserves the public-link surface and balanced actions, with honest wording when its current read failed. */
function PublicContribution({
  item,
  disabled,
  onWithdraw,
  onReplace,
  stale = false,
}: PublicContributionProps) {
  const { colors } = useTheme();
  return (
    <Surface>
      <View style={styles.version}>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.title, { color: colors.text }]}
        >
          {stale ? "Dernier lien public connu" : "Votre lien public"}
        </Text>
        <Text
          selectable
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {item.url}
        </Text>
        <View style={styles.actions}>
          {onReplace && (
            <View style={styles.activeAction}>
              <Button
                label="Remplacer"
                fullWidth
                accessibilityHint="Créer une nouvelle version sans modifier l’adresse enregistrée"
                variant="secondary"
                disabled={disabled}
                onPress={onReplace}
              />
            </View>
          )}
          {item.canWithdraw && (
            <View style={styles.activeAction}>
              <Button
                label="Retirer"
                fullWidth
                accessibilityHint="Retirer uniquement votre lien actif après confirmation"
                variant="secondary"
                disabled={disabled}
                onPress={onWithdraw}
              />
            </View>
          )}
        </View>
      </View>
    </Surface>
  );
}

/** One immutable proposal, including the published version; only current canCancel permits the independent icon action. */
interface ProposalRowProps {
  item: OwnStreamContributionResponse;
  disabled: boolean;
  onCancel(): void;
}

/** Follows the basic-list row anatomy while keeping the explanatory status and cancellation independently accessible. */
function ProposalRow({ item, disabled, onCancel }: ProposalRowProps) {
  const { colors } = useTheme();
  const state = states[item.state];
  const backgroundColor =
    item.state === "active"
      ? colors.successSubtle
      : item.state === "pending"
        ? colors.warning
        : item.state === "rejected" || item.state === "hidden"
          ? colors.errorSubtle
          : colors.subtle;
  const color =
    item.state === "active"
      ? colors.onSuccessSubtle
      : item.state === "pending"
        ? colors.onWarning
        : item.state === "rejected" || item.state === "hidden"
          ? colors.error
          : colors.secondaryText;
  return (
    <View style={styles.proposal}>
      <View style={styles.proposalContent}>
        <Text
          accessibilityHint={state.explanation}
          style={[
            styles.badge,
            { color, backgroundColor },
            item.state === "active" && {
              borderWidth: tokens.border.thin,
              borderColor: colors.onSuccessSubtle,
            },
          ]}
        >
          {state.title}
        </Text>
        <Text
          selectable
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {item.url}
        </Text>
      </View>
      {item.canCancel && (
        <IconButton
          label="Annuler la proposition"
          disabled={disabled}
          onPress={onCancel}
        >
          <Trash2 color={colors.error} size={tokens.size.icon.md} />
        </IconButton>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    gap: tokens.layout.list.gap,
    paddingBottom: tokens.layout.list.gap,
  },
  version: { gap: tokens.spacing.md },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  activeAction: { flex: 1 },
  proposal: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.size.control.default,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  proposalContent: { flex: 1, minWidth: 0, gap: tokens.spacing.tight },
  badge: {
    ...tokens.typography.metadata,
    alignSelf: "flex-start",
    minHeight: tokens.size.icon.lg,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
  },
});
