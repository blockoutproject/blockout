import { PageFlatList } from "@/shared/components/page-list";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
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
import type {
  OwnStreamContributionResponse,
  StreamContributionStateEnum,
} from "../../../../.generated/schemas/index.zod";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { Button } from "@/shared/components/button";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { EntryGroupSeparator } from "@/shared/components/entry-group";
import { ListContinuation } from "@/shared/components/list-continuation";
import { Page, pageContentStyle } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ContributionProposalsLoading } from "../components/contribution-loading";
import { ScreenState } from "@/shared/components/screen-state";

import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { AccountSessionFeedback } from "@/features/accounts/current-account";
import {
  MatchSummary,
  useConsultationQueries,
} from "@/features/sporting/match-consultation";
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
}: Readonly<OwnContributionsScreenProps>) {
  const editing = useOwnContributions(matchId);
  const match = useQuery(useConsultationQueries().match(matchId));
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { query, change, submit, session } = editing;
  const current = query.data?.pages[0];
  const authorized =
    editing.canRetain &&
    !isOwnContributionAccessDenied(query.error) &&
    !isOwnContributionAccessDenied(match.error);
  const rows =
    authorized && (!hasReadError(query) || query.isFetchNextPageError)
      ? [
          ...new Map(
            (query.data?.pages ?? [])
              .flatMap((page) => page.items)
              .map((item) => [item.id, item]),
          ).values(),
        ]
      : [];
  const active = authorized ? current?.activeContribution : undefined;

  function refresh() {
    return Promise.allSettled([
      editing.refresh(),
      match.refetch({ cancelRefetch: false }),
    ]);
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
    ) {
      return;
    }
    await query.fetchNextPage({ cancelRefetch: false });
  }

  const requiredRead = !editing.usable
    ? editing.profile
    : ([editing.profile, match, query].find(
        (read) =>
          hasReadError(read) && (read !== query || !query.isFetchNextPageError),
      ) ??
      (!editing.profile.data ? editing.profile : !match.data ? match : query));
  const blocked =
    session.status !== "authenticated" ||
    !editing.canRetain ||
    !current ||
    !authorized ||
    !match.data;
  const readFailed =
    hasReadError(requiredRead) &&
    (requiredRead !== query || !query.isFetchNextPageError);
  const pending =
    session.status !== "authenticated"
      ? session.status === "restoring" || !!session.operation
      : !readFailed && requiredRead.isLoading;
  const FeedbackLayout = pending || !blocked ? View : ScreenState;

  const content = (
    <Page
      edges={["top", "left", "right"]}
      header={<PageHeader title="Lien de diffusion" />}
    >
      <PageFlatList
        {...hiddenScrollIndicators}
        accessibilityLabel="Liste de mes propositions"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        keyboardShouldPersistTaps="handled"
        renderScrollComponent={
          Platform.OS === "android" ? renderAndroidScroll : undefined
        }
        alwaysBounceVertical={!blocked && !readFailed}
        contentContainerStyle={pageContentStyle}
        data={rows}
        keyExtractor={(item) => item.id}
        onEndReached={() => {
          if (!query.isError) {
            void loadMore();
          }
        }}
        ItemSeparatorComponent={EntryGroupSeparator}
        refreshControl={
          <DataRefreshControl
            enabled={
              !blocked && !readFailed && !change.isPending && !submit.isPending
            }
            fetching={query.isFetching || match.isFetching}
            onRefresh={refresh}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {(blocked || readFailed) && (
              <FeedbackLayout style={pending ? undefined : styles.feedback}>
                {session.status === "guest" ? (
                  <Button
                    label="Se connecter"
                    onPress={() =>
                      router.push({
                        pathname: "/sign-in-invitation",
                        params: { reason: "contribution" },
                      })
                    }
                  />
                ) : session.status !== "authenticated" ? (
                  <AccountSessionFeedback
                    loadingContent={<ContributionProposalsLoading />}
                  />
                ) : (
                  <ReadFeedback
                    failed={
                      !editing.usable &&
                      editing.session.status === "authenticated" &&
                      !editing.profile.isPending
                    }
                    query={requiredRead}
                    loadingContent={<ContributionProposalsLoading />}
                    onRetry={
                      requiredRead === editing.profile ? undefined : refresh
                    }
                  />
                )}
              </FeedbackLayout>
            )}
            <View style={blocked ? styles.hidden : styles.editor}>
              {match.data && !hasReadError(match) && (
                <MatchSummary match={match.data.match} presentation="context" />
              )}
              {current && active && (
                <ContributionForm
                  key={`${session.subject}:${session.accountId}:${matchId}`}
                  matchId={matchId}
                  current={current}
                  editing={editing}
                  replacement={active}
                />
              )}
              {!current?.eligibility.canSubmit &&
                current?.eligibility.reason && (
                  <Text
                    style={[
                      tokens.typography.body,
                      { color: colors.secondaryText },
                    ]}
                  >
                    {current.eligibility.reason}
                  </Text>
                )}
            </View>
            <Text
              accessibilityRole="header"
              style={[tokens.typography.heading, { color: colors.text }]}
            >
              {!blocked && current
                ? `Mes propositions (${current.proposalCount})`
                : "Mes propositions"}
            </Text>
          </View>
        }
        renderItem={({ item }) => <ProposalRow item={item} />}
        ListFooterComponent={
          <>
            {!blocked && (
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
    </Page>
  );
  return Platform.OS === "android" ? (
    <KeyboardProvider>{content}</KeyboardProvider>
  ) : (
    content
  );
}

/** Keeps Android keyboard handling on the virtualized list's own supported scroll component. */
function renderAndroidScroll(props: Readonly<ScrollViewProps>) {
  return <KeyboardAwareScrollView {...props} />;
}

/** One retained personal version; its state never grants a command in the read-only history. */
interface ProposalRowProps {
  item: OwnStreamContributionResponse;
}

/** Shows the immutable address and textual semantic badge without exposing any row action. */
function ProposalRow({ item }: Readonly<ProposalRowProps>) {
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
  // The virtualized header already owns the shared horizontal inset and first eight points above feedback.
  feedback: { padding: 0, paddingTop: tokens.spacing.sm },
  hidden: { display: "none" },
  editor: { gap: tokens.layout.list.gap },
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
