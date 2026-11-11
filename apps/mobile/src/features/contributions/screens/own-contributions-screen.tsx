import { PageFlatList } from "../../../shared/components/page-list";
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
import { ContributionProposalsLoading } from "../components/contribution-loading";
import { ScreenState } from "../../../shared/components/screen-state";

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
}: Readonly<OwnContributionsScreenProps>) {
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
    if (change.isPending || submit.isPending) {
      return;
    }
    feedback.clear();
    const results = await Promise.allSettled([
      editing.refresh(),
      match.refetch({ throwOnError: true }),
    ]);
    if (
      mounted.current &&
      results.some((result) => result.status === "rejected")
    ) {
      feedback.error();
    }
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
    feedback.clear();
    await query.fetchNextPage({ cancelRefetch: false });
  }

  /** Distinguishes session recovery and profile admission from initial proposal loading. */
  function isInitialReadPending() {
    if (session.status !== "authenticated") {
      return session.status === "restoring" || !!session.operation;
    }
    if (!editing.profile.data) {
      return editing.profile.isLoading;
    }
    return (
      editing.canRetain &&
      (!current || !authorized) &&
      !isOwnContributionAccessDenied(match.error) &&
      query.isLoading
    );
  }

  const pending = session.status !== "guest" && isInitialReadPending();
  const FeedbackLayout = pending ? View : ScreenState;

  /** Keeps current-account admission and retained editor feedback in one ordered decision. */
  function renderEditorContent() {
    if (session.status === "guest") {
      return (
        <FeedbackLayout style={[styles.feedback, styles.centered]}>
          <Button
            label="Se connecter"
            onPress={() =>
              router.push({
                pathname: "/sign-in-invitation",
                params: { reason: "contribution" },
              })
            }
          />
        </FeedbackLayout>
      );
    }
    if (session.status !== "authenticated") {
      return (
        <FeedbackLayout
          style={pending ? undefined : [styles.feedback, styles.centered]}
        >
          {session.status === "restoring" || session.operation ? (
            <ContributionProposalsLoading />
          ) : (
            <Button
              label="Se connecter"
              onPress={() => router.push("/sign-in")}
            />
          )}
        </FeedbackLayout>
      );
    }
    if (!editing.profile.data || (editing.profile.isError && !current)) {
      return (
        <FeedbackLayout style={pending ? undefined : styles.feedback}>
          <ReadFeedback
            query={editing.profile}
            loadingContent={<ContributionProposalsLoading />}
          />
        </FeedbackLayout>
      );
    }
    if (!editing.canRetain) {
      return (
        <FeedbackLayout style={styles.feedback}>
          <ErrorState
            onRetry={() => void editing.profile.refetch()}
            retrying={editing.profile.isFetching}
          />
        </FeedbackLayout>
      );
    }
    if (!current || !authorized) {
      return (
        <FeedbackLayout style={pending ? undefined : styles.feedback}>
          {query.isError || isOwnContributionAccessDenied(match.error) ? (
            <ErrorState
              onRetry={() => void refresh()}
              retrying={query.isFetching || match.isFetching}
            />
          ) : (
            <ReadFeedback
              query={query}
              loadingContent={<ContributionProposalsLoading />}
            />
          )}
        </FeedbackLayout>
      );
    }
    return (
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
        {!current.eligibility.canSubmit && current.eligibility.reason && (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            {current.eligibility.reason}
          </Text>
        )}
      </>
    );
  }

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
        alwaysBounceVertical={authorized && !!current}
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
          authorized && current ? (
            <DataRefreshControl
              enabled={!change.isPending && !submit.isPending}
              onRefresh={refresh}
            />
          ) : undefined
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {authorized && current && match.data && (
              <MatchSummary match={match.data.match} presentation="context" />
            )}
            {renderEditorContent()}
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
  centered: { justifyContent: "center" },
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
