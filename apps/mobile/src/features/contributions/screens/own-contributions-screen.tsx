import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  AppState,
  Platform,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
} from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
} from "react-native-keyboard-controller";
import Animated from "react-native-reanimated";
import type {
  OwnStreamContributionResponse,
  StreamContributionStateEnum,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { EntryGroupSeparator } from "../../../shared/components/entry-group";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { Page, pageContentStyle } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { ErrorState } from "../../../shared/components/state-card";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import {
  MatchSummary,
  useConsultationQueries,
} from "../../sporting/match-consultation";
import {
  isOwnContributionAccessDenied,
  useOwnContributions,
} from "../api/own-contributions";
import { ContributionForm } from "../forms/contribution-form";
import { ContributionStateBadge } from "../components/contribution-state-badge";

/** One match's personal proposals; the original-account read supplies permissions and sporting refusal revokes retained details. */
export interface OwnContributionsScreenProps {
  matchId: string;
}
/** French lifecycle explanations reveal neither other proposals nor private moderation reasons. */
const states: Record<
  StreamContributionStateEnum,
  {
    title: string;
    explanation: string;
  }
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
/** Combines the exact current owner editor with a virtualized, read-only history under the existing Query/session owner. */
export function OwnContributionsScreen({
  matchId,
}: OwnContributionsScreenProps) {
  const editing = useOwnContributions(matchId);
  const match = useQuery(useConsultationQueries().match(matchId));
  const router = useRouter();
  const navigation = useNavigation();
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { query, change, submit, session } = editing;
  const current = query.data?.pages[0];
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
  const active = authorized ? current?.activeContribution : undefined;
  /** Rereads displayed context and personal history together; an ordinary failure preserves their authorized data. */
  async function refresh() {
    if (change.isPending || submit.isPending) return;
    feedback.clear();
    const results = await Promise.allSettled([
      editing.refresh(),
      match.refetch({ throwOnError: true }),
    ]);
    if (
      mounted.current &&
      results.some((result) => result.status === "rejected")
    )
      feedback.error();
  }
  /** Continues the same native page traversal; failed continuations wait for the explicit footer retry. */
  async function loadMore() {
    if (
      !navigation.isFocused() ||
      AppState.currentState !== "active" ||
      !authorized ||
      !query.hasNextPage ||
      query.isFetching ||
      change.isPending ||
      submit.isPending ||
      (query.isError && !query.isFetchNextPageError)
    )
      return;
    feedback.clear();
    const result = await query.fetchNextPage({ cancelRefetch: false });
    if (
      mounted.current &&
      result.isError &&
      navigation.isFocused() &&
      AppState.currentState === "active"
    )
      feedback.error();
  }
  const content = (
    <Page edges={["left", "right"]}>
      <ScrollChrome header={<PageHeader title="Lien de diffusion" />}>
        {({ onScroll, headerHeight }) => (
          <Animated.FlatList
            {...hiddenScrollIndicators}
            accessibilityLabel="Liste de mes propositions"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            keyboardShouldPersistTaps="handled"
            renderScrollComponent={
              Platform.OS === "android" ? renderAndroidScroll : undefined
            }
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
                  enabled={!change.isPending && !submit.isPending}
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
                      <ContributionForm
                        matchId={matchId}
                        current={current}
                        editing={editing}
                        replacement={active}
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
            renderItem={({ item }) => <ProposalRow item={item} />}
            ListFooterComponent={
              <>
                {authorized && (
                  <ListContinuation
                    loading={query.isFetchingNextPage}
                    failed={query.isFetchNextPageError}
                    disabled={
                      query.isFetching || change.isPending || submit.isPending
                    }
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
  return Platform.OS === "android" ? (
    <KeyboardProvider>{content}</KeyboardProvider>
  ) : (
    content
  );
}
/** Keeps Android keyboard handling on the virtualized list's own supported scroll component. */
function renderAndroidScroll(props: ScrollViewProps) {
  return <KeyboardAwareScrollView {...props} />;
}
/** One retained personal version; its state never grants a command in the read-only history. */
interface ProposalRowProps {
  item: OwnStreamContributionResponse;
}
/** Shows the immutable address and textual semantic badge without exposing any row action. */
function ProposalRow({ item }: ProposalRowProps) {
  const { colors } = useTheme();
  const state = states[item.state];
  return (
    <View style={styles.proposal}>
      <View style={styles.proposalContent}>
        <ContributionStateBadge
          state={item.state}
          label={state.title}
          explanation={state.explanation}
        />
        <Text
          selectable
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {item.url}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    gap: tokens.layout.list.gap,
    paddingBottom: tokens.layout.list.gap,
  },
  proposal: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.size.control.default,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  proposalContent: { flex: 1, minWidth: 0, gap: tokens.spacing.tight },
});
