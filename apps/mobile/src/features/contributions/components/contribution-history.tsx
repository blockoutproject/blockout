import { ArrowUpRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  ModeratedStreamContributionResponse,
  StreamModerationActionEnum,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { EntryRow } from "../../../shared/components/entry-row";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { useNativeHandoff } from "../../../shared/native/use-native-handoff";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useModerationReports } from "../api/moderation";
import {
  contributionStateLabels,
  contributionDecisionLabels,
  streamPlatformLabels,
  moderationTime,
} from "../model/moderation-presentation";
import { ContributionStateBadge } from "./contribution-state-badge";

/** One exact version; command owners supply original actor/revision confirmation, while linked-version sheets stay read-only. */
export interface ContributionHistoryProps {
  matchId: string;
  contribution: ModeratedStreamContributionResponse;
  historical?: boolean;
  /** The active editor already supplies the provider/state heading and external opening. */
  detailsOnly?: boolean;
  busy: boolean;
  onAction?: (
    version: ModeratedStreamContributionResponse,
    action: StreamModerationActionEnum | "reactivate",
  ) => void;
}

/** Groups each version in a soft surface; report headings/reasons share one inset on the base surface. */
export function ContributionHistory({
  matchId,
  contribution: version,
  historical = false,
  detailsOnly = false,
  busy,
  onAction,
}: ContributionHistoryProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const handoff = useNativeHandoff(version.url);
  const feedback = useActionFeedback();
  const [expanded, setExpanded] = useState(!historical);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reportPage, setReportPage] = useState(0);
  const reports = useModerationReports(
    matchId,
    version.id,
    reportsOpen && expanded,
  );
  const reportContent = reports.data?.pages[reportPage];
  const platform = streamPlatformLabels[version.platform];
  const state = contributionStateLabels[version.state];
  /** Failed continuation retains the current twenty-row page; only a later explicit action retries it. */
  async function nextReports() {
    if (reports.isFetching) return;
    if (reportPage + 1 < (reports.data?.pages.length ?? 0)) {
      setReportPage(reportPage + 1);
      return;
    }
    const next = await reports.fetchNextPage({ cancelRefetch: false });
    if (next.isFetchNextPageError) feedback.error();
    else setReportPage(reportPage + 1);
  }
  /** Opens the exact related HTTP member, including a source outside the loaded history page. */
  function openRelated(versionId: string, relation: "source" | "replacement") {
    router.push({
      pathname: "/administration/stream-links/version",
      params: { matchId, versionId, relation },
    });
  }
  return (
    <View
      style={
        !detailsOnly && [styles.card, { backgroundColor: colors.insetSurface }]
      }
    >
      {!detailsOnly && (
        <EntryRow
          label={platform}
          labelAccessory={
            <ContributionStateBadge state={version.state} label={state} />
          }
          accessibilityLabel={`${platform}, ${state}`}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          style={styles.heading}
        />
      )}
      {expanded && (
        <View style={[styles.content, !detailsOnly && styles.inset]}>
          <View style={styles.metadata}>
            <Text style={[tokens.typography.metadata, { color: colors.text }]}>
              {version.authorName ?? "Auteur effacé"}
            </Text>
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              {moderationTime(version.submittedAt)}
            </Text>
          </View>
          {!detailsOnly && (
            <View>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Ouvrir ${version.url}`}
                disabled={handoff.pending}
                onPress={() => void handoff.open()}
                style={styles.address}
              >
                <Text
                  style={[
                    tokens.typography.body,
                    styles.addressText,
                    { color: colors.text },
                  ]}
                >
                  {version.url}
                </Text>
                <ArrowUpRight
                  accessible={false}
                  size={tokens.size.icon.md}
                  color={colors.icon}
                />
              </Pressable>
              {onAction &&
                (version.canApprove ||
                  version.canReject ||
                  version.canReactivate) && (
                  <View style={styles.actions}>
                    {version.canApprove && (
                      <View style={styles.action}>
                        <Button
                          label="Approuver"
                          fullWidth
                          disabled={busy}
                          onPress={() => onAction(version, "approve")}
                        />
                      </View>
                    )}
                    {version.canReject && (
                      <View style={styles.action}>
                        <Button
                          label="Refuser"
                          fullWidth
                          variant="secondary"
                          disabled={busy}
                          onPress={() => onAction(version, "reject")}
                        />
                      </View>
                    )}
                    {version.canReactivate && (
                      <View style={styles.action}>
                        <Button
                          label="Réactiver"
                          fullWidth
                          variant="secondary"
                          disabled={busy}
                          onPress={() => onAction(version, "reactivate")}
                        />
                      </View>
                    )}
                  </View>
                )}
            </View>
          )}
          {version.decisions.length > 0 && (
            <View style={styles.decisions}>
              {version.decisions.map((decision, index) => (
                <Text
                  key={`${decision.kind}:${decision.at}:${index}`}
                  style={[
                    tokens.typography.metadata,
                    { color: colors.secondaryText },
                  ]}
                >
                  {contributionDecisionLabels[decision.kind]} ·{" "}
                  {moderationTime(decision.at)}
                  {decision.actorName ? ` · ${decision.actorName}` : ""}
                </Text>
              ))}
            </View>
          )}
          {version.sourceVersionId && (
            <EntryRow
              label="Version d’origine"
              disclosure
              style={styles.related}
              onPress={() => openRelated(version.sourceVersionId!, "source")}
            />
          )}
          {version.replacedByVersionId && (
            <EntryRow
              label="Version de remplacement"
              disclosure
              style={styles.related}
              onPress={() =>
                openRelated(version.replacedByVersionId!, "replacement")
              }
            />
          )}
          <View style={[styles.reports, { backgroundColor: colors.surface }]}>
            <EntryRow
              label={`Signalements (${reportContent?.count ?? version.reportCount})`}
              accessibilityState={{ expanded: reportsOpen }}
              onPress={() => setReportsOpen(!reportsOpen)}
              style={styles.reportHeading}
            />
            {reportsOpen && (
              <View style={styles.reportContent}>
                {!reportContent ? (
                  <ReadFeedback query={reports} />
                ) : (
                  <>
                    {reportContent.items.length === 0 && (
                      <Text
                        style={[
                          tokens.typography.body,
                          { color: colors.secondaryText },
                        ]}
                      >
                        Aucun signalement
                      </Text>
                    )}
                    {reportContent.items.map((report) => (
                      <View key={report.id} style={styles.report}>
                        <Text
                          style={[
                            tokens.typography.metadata,
                            { color: colors.secondaryText },
                          ]}
                        >
                          {moderationTime(report.reportedAt)}
                        </Text>
                        <Text
                          style={[
                            tokens.typography.body,
                            { color: colors.text },
                          ]}
                        >
                          {report.reason ?? "Motif indisponible"}
                        </Text>
                      </View>
                    ))}
                    {reportPage > 0 && (
                      <Button
                        label="Signalements précédents"
                        variant="secondary"
                        fullWidth
                        onPress={() => setReportPage(reportPage - 1)}
                      />
                    )}
                    {reportContent.nextPage !== undefined && (
                      <Button
                        label="Signalements suivants"
                        variant="secondary"
                        fullWidth
                        loading={reports.isFetchingNextPage}
                        onPress={() => void nextReports()}
                      />
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: tokens.radius.control, overflow: "hidden" },
  heading: { paddingHorizontal: tokens.spacing.md },
  content: { gap: tokens.spacing.md },
  inset: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: tokens.spacing.xs,
  },
  address: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    minHeight: tokens.touch.minimum,
  },
  addressText: { flex: 1 },
  actions: { flexDirection: "row", gap: tokens.spacing.sm },
  action: { flex: 1 },
  decisions: { gap: tokens.spacing.xs },
  related: { paddingHorizontal: 0, paddingVertical: tokens.spacing.sm },
  reports: {
    borderRadius: tokens.radius.control,
    paddingHorizontal: tokens.spacing.md,
  },
  reportHeading: { paddingHorizontal: 0, paddingVertical: tokens.spacing.sm },
  reportContent: { paddingBottom: tokens.spacing.sm, gap: tokens.spacing.sm },
  report: { gap: tokens.spacing.xs, paddingVertical: tokens.spacing.xs },
});
