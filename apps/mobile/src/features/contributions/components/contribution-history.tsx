import { Image } from "expo-image";
import { ChevronDown, ChevronUp, Play } from "lucide-react-native";
import { useState } from "react";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useNativeHandoff } from "../../../shared/native/use-native-handoff";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  ModeratedStreamContributionResponse,
  StreamModerationActionEnum,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { EntryRow } from "../../../shared/components/entry-row";
import { Surface } from "../../../shared/components/surface";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useModerationReports } from "../api/moderation";
import {
  contributionStateLabels,
  contributionDecisionLabels,
  streamPlatformLabels,
  moderationTime,
} from "../model/moderation-presentation";

/** One exact-version card; parent owns captured revisions, confirmation and command settlement. */
export interface ContributionHistoryProps {
  matchId: string;
  contribution: ModeratedStreamContributionResponse;
  historical?: boolean;
  busy: boolean;
  onAction: (
    version: ModeratedStreamContributionResponse,
    action: StreamModerationActionEnum | "reactivate",
  ) => void;
  onReplace?: () => void;
}
/** Shows useful lineage/decisions and bounded exact-version report pages without reporter identity. */
export function ContributionHistory({
  matchId,
  contribution: version,
  historical = false,
  busy,
  onAction,
  onReplace,
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
  const artwork =
    version.platform === "twitch"
      ? require("../../../../assets/contributions/twitch.svg")
      : require("../../../../assets/contributions/youtube.svg");
  const providerColor = {
    youtube: "#D92737",
    twitch: "#7454B7",
    facebook: "#2868C9",
  }[version.platform];
  /** Reads one next native page; only twenty report rows are rendered within this disclosure. */
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
    <Surface>
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
        <>
          <View style={styles.identity}>
            <View style={[styles.provider, { backgroundColor: providerColor }]}>
              {version.platform === "facebook" ? (
                <Text
                  style={[
                    tokens.typography.heading,
                    { color: colors.onDarkAccent },
                  ]}
                >
                  f
                </Text>
              ) : (
                <Image
                  source={artwork}
                  style={styles.mark}
                  contentFit="contain"
                  accessible={false}
                />
              )}
            </View>
            <Text
              style={[
                tokens.typography.strong,
                { color: colors.text, flex: 1 },
              ]}
            >
              {platform}
            </Text>
            <Text
              style={[
                styles.badge,
                {
                  color: colors.secondaryText,
                  backgroundColor: colors.subtle,
                  borderColor: colors.border,
                },
              ]}
            >
              {state}
            </Text>
          </View>
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            {version.authorName ?? "Auteur effacé"} ·{" "}
            {moderationTime(version.submittedAt)}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Ouvrir ${version.url}`}
            disabled={handoff.pending}
            onPress={() => void handoff.open()}
            style={[
              styles.address,
              { backgroundColor: colors.subtle, borderColor: colors.border },
            ]}
          >
            <Text
              style={[tokens.typography.body, { color: colors.text, flex: 1 }]}
            >
              {version.url}
            </Text>
            <Play
              accessible={false}
              color={colors.icon}
              size={tokens.size.icon.sm}
            />
          </Pressable>
          <View style={styles.actions}>
            {version.canApprove && (
              <Button
                label="Approuver"
                disabled={busy}
                onPress={() => onAction(version, "approve")}
              />
            )}
            {version.canReject && (
              <Button
                label="Refuser"
                variant="secondary"
                disabled={busy}
                onPress={() => onAction(version, "reject")}
              />
            )}
            {version.canWithdraw && (
              <Button
                label="Retirer"
                variant="secondary"
                disabled={busy}
                onPress={() => onAction(version, "withdraw")}
              />
            )}
            {version.canReactivate && (
              <Button
                label="Réactiver"
                variant="secondary"
                disabled={busy}
                onPress={() => onAction(version, "reactivate")}
              />
            )}
            {onReplace && (
              <Button
                label="Remplacer"
                variant="secondary"
                disabled={busy}
                onPress={onReplace}
              />
            )}
          </View>
          {version.sourceVersionId && (
            <Text
              selectable
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              Réactivation de la version {version.sourceVersionId}
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
              Remplacé par la version {version.replacedByVersionId}
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
            onPress={() => setReportsOpen(!reportsOpen)}
            accessibilityState={{ expanded: reportsOpen }}
            trailing={
              reportsOpen ? (
                <ChevronUp color={colors.icon} />
              ) : (
                <ChevronDown color={colors.icon} />
              )
            }
          />
          {reportsOpen && (
            <>
              {!reportContent ? (
                <ReadFeedback query={reports} />
              ) : (
                <>
                  <Text
                    style={[tokens.typography.strong, { color: colors.text }]}
                  >
                    {reportContent.count} signalements sur cette version
                  </Text>
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
                        style={[tokens.typography.body, { color: colors.text }]}
                      >
                        {report.reason ?? "Motif indisponible"}
                      </Text>
                    </View>
                  ))}
                  {reportPage > 0 && (
                    <Button
                      label="Signalements précédents"
                      variant="secondary"
                      onPress={() => setReportPage(reportPage - 1)}
                    />
                  )}
                  {reportContent.nextPage !== undefined && (
                    <Button
                      label="Signalements suivants"
                      variant="secondary"
                      loading={reports.isFetchingNextPage}
                      onPress={() => void nextReports()}
                    />
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </Surface>
  );
}
const styles = StyleSheet.create({
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  provider: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: { width: 20, height: 20 },
  badge: {
    ...tokens.typography.metadata,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    flexShrink: 1,
  },
  address: {
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  report: { gap: tokens.spacing.xs },
});
