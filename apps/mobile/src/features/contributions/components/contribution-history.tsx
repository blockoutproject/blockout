import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  ModeratedStreamContributionResponse,
  StreamModerationActionEnum,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { EntryGroup } from "../../../shared/components/entry-group";
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

/** One exact-version list item; the parent owns original actor/revision confirmation and command settlement. */
export interface ContributionHistoryProps {
  matchId: string;
  contribution: ModeratedStreamContributionResponse;
  historical?: boolean;
  /** The active address editor already supplies its state and withdrawal action. */
  detailsOnly?: boolean;
  busy: boolean;
  onAction: (
    version: ModeratedStreamContributionResponse,
    action: StreamModerationActionEnum | "reactivate",
  ) => void;
}

/** Uses the existing basic-list rows, personal state badge and grouped report rows for private history. */
export function ContributionHistory({
  matchId,
  contribution: version,
  historical = false,
  detailsOnly = false,
  busy,
  onAction,
}: ContributionHistoryProps) {
  const { colors } = useTheme();
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
  /** Reads one native next page; a failed continuation keeps the current twenty-row disclosure. */
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
  return (
    <View>
      {historical && (
        <EntryRow
          label={`${platform} · ${state}`}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          trailing={
            expanded ? (
              <ChevronUp color={colors.icon} />
            ) : (
              <ChevronDown color={colors.icon} />
            )
          }
        />
      )}
      {expanded && (
        <View style={styles.content}>
          {!detailsOnly && (
            <ContributionStateBadge state={version.state} label={state} />
          )}
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            {version.authorName ?? "Auteur effacé"} ·{" "}
            {moderationTime(version.submittedAt)}
          </Text>
          <EntryRow
            label={detailsOnly ? "Ouvrir le lien publié" : version.url}
            accessibilityRole="link"
            accessibilityLabel={`Ouvrir ${version.url}`}
            disabled={handoff.pending}
            onPress={() => void handoff.open()}
          />
          {!detailsOnly && (
            <View style={styles.actions}>
              {version.canApprove && (
                <Button
                  label="Approuver"
                  fullWidth
                  disabled={busy}
                  onPress={() => onAction(version, "approve")}
                />
              )}
              {version.canReject && (
                <Button
                  label="Refuser"
                  fullWidth
                  variant="secondary"
                  disabled={busy}
                  onPress={() => onAction(version, "reject")}
                />
              )}
              {version.canReactivate && (
                <Button
                  label="Réactiver"
                  fullWidth
                  variant="secondary"
                  disabled={busy}
                  onPress={() => onAction(version, "reactivate")}
                />
              )}
            </View>
          )}
          {version.sourceVersionId && (
            <Text
              selectable
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              Réactivé depuis une version conservée dans l’historique. Les
              signalements d’origine restent sur cette version d’origine.
            </Text>
          )}
          {version.replacedByVersionId && (
            <Text
              selectable
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              Remplacé par une autre version ; les signalements de cette version
              sont conservés.
            </Text>
          )}
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
          <EntryRow
            label={`Signalements (${version.reportCount})`}
            accessibilityState={{ expanded: reportsOpen }}
            onPress={() => setReportsOpen(!reportsOpen)}
            trailing={
              reportsOpen ? (
                <ChevronUp color={colors.icon} />
              ) : (
                <ChevronDown color={colors.icon} />
              )
            }
          />
          {reportsOpen &&
            (!reportContent ? (
              <ReadFeedback query={reports} />
            ) : (
              <>
                <Text
                  style={[tokens.typography.strong, { color: colors.text }]}
                >
                  {reportContent.count}{" "}
                  {reportContent.count === 1 ? "signalement" : "signalements"}{" "}
                  sur cette version
                </Text>
                {reportContent.items.length > 0 && (
                  <EntryGroup>
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
                  </EntryGroup>
                )}
                <View style={styles.actions}>
                  {reportPage > 0 && (
                    <Button
                      label="Signalements précédents"
                      fullWidth
                      variant="secondary"
                      onPress={() => setReportPage(reportPage - 1)}
                    />
                  )}
                  {reportContent.nextPage !== undefined && (
                    <Button
                      label="Signalements suivants"
                      fullWidth
                      variant="secondary"
                      loading={reports.isFetchingNextPage}
                      onPress={() => void nextReports()}
                    />
                  )}
                </View>
              </>
            ))}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    gap: tokens.layout.form.gap,
  },
  actions: { gap: tokens.layout.form.gap },
  report: {
    minHeight: tokens.size.control.default,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.tight,
  },
});
