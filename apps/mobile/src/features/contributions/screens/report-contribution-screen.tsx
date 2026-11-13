import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CircleCheck } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import type {
  CreateStreamReportRequest,
  MatchDetailResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "@/shared/api/api-fetch";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ContributionReportLoading } from "../components/contribution-loading";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";

import { Surface } from "@/shared/components/surface";
import { TextField } from "@/shared/components/text-field";
import { useDiscardChanges } from "@/shared/forms/use-discard-changes";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { AccountSessionFeedback } from "@/features/accounts/current-account";
import {
  MatchSummary,
  useConsultationQueries,
} from "@/features/sporting/match-consultation";
import { useContributionReport } from "../api/contribution-reports";
import { isOwnContributionAccessDenied } from "../api/own-contributions";

/** Captured F03 identity; every explicit attempt keeps this exact version. */
export interface ReportContributionScreenProps {
  matchId: string;
  contributionId: string;
  /** The public address viewed beside this version; display only, never sent to the report API. */
  contributionUrl?: string;
}

const reasonSchema = z.object({
  reason: z.string().trim().min(1, "Indiquez le motif du signalement."),
});

/** Ordinary report route; F05 owns session recovery before private reads, with no deferred report or F10 support payload. */
export function ReportContributionScreen({
  matchId,
  contributionId,
  contributionUrl,
}: Readonly<ReportContributionScreenProps>) {
  const reporting = useContributionReport(matchId, contributionId);
  const match = useQuery(useConsultationQueries().match(matchId));
  const router = useRouter();
  const authenticated = reporting.session.status === "authenticated";
  const sessionPending =
    reporting.session.status === "restoring" || !!reporting.session.operation;

  const requiredRead = !reporting.usable
    ? reporting.profile
    : ([reporting.profile, match, reporting.query].find(hasReadError) ??
      (!match.data ? match : reporting.query));
  const blocked =
    !authenticated ||
    !reporting.usable ||
    (!reporting.query.data && !reporting.command.data?.reported);
  const pending = !authenticated
    ? sessionPending
    : !hasReadError(requiredRead) && requiredRead.isLoading;
  const readFailed = hasReadError(requiredRead);
  const FeedbackLayout = pending || !blocked ? PageContent : ScreenState;

  return (
    <Page header={<PageHeader title="Lien de diffusion" />}>
      <FormScrollView>
        {(blocked || readFailed || !match.data) && (
          <FeedbackLayout>
            {reporting.session.status === "guest" ? (
              <Button
                label="Se connecter"
                onPress={() =>
                  router.push({
                    pathname: "/sign-in-invitation",
                    params: { reason: "stream-report" },
                  })
                }
              />
            ) : !authenticated ? (
              <AccountSessionFeedback
                loadingContent={<ContributionReportLoading />}
              />
            ) : (
              <ReadFeedback
                failed={!reporting.usable && !reporting.profile.isPending}
                query={requiredRead}
                loadingContent={<ContributionReportLoading />}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent style={blocked ? styles.hidden : undefined}>
          {match.data && !hasReadError(match) && (
            <MatchSummary match={match.data.match} presentation="context" />
          )}
          <ReportForm
            key={`${reporting.session.subject}:${reporting.session.accountId}:${contributionId}`}
            matchId={matchId}
            contributionId={contributionId}
            contributionUrl={contributionUrl}
            reporting={reporting}
            match={match}
          />
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

/** Native form on approved report node 5534:59410; its retained reason always belongs to the viewed version. */
function ReportForm({
  matchId,
  contributionId,
  contributionUrl,
  reporting,
  match,
}: Readonly<
  ReportContributionScreenProps & {
    reporting: ReturnType<typeof useContributionReport>;
    match: UseQueryResult<MatchDetailResponse>;
  }
>) {
  const { colors } = useTheme();
  const router = useRouter();
  const feedback = useActionFeedback();
  const { command, query } = reporting;
  const mounted = useRef(true);
  const { control, handleSubmit, reset, setError } =
    useForm<CreateStreamReportRequest>({
      resolver: zodResolver(reasonSchema),
      defaultValues: { reason: "" },
    });
  const { isDirty } = useFormState({ control });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const matchAvailable =
    match.data !== undefined && !isOwnContributionAccessDenied(match.error);
  const currentVersionUrl =
    match.data?.streamContributionId === contributionId
      ? match.data.streamUrl
      : undefined;
  const targetUrl = matchAvailable
    ? (contributionUrl ?? currentVersionUrl)
    : undefined;
  const reported =
    command.data?.reported === true ||
    (reporting.usable &&
      matchAvailable &&
      !isOwnContributionAccessDenied(query.error) &&
      query.data?.reported === true);
  useDiscardChanges(isDirty && !reported, () => {
    reset({ reason: "" });
  });
  const busy = command.isPending;
  const disabled = !reporting.usable || !matchAvailable || !query.data || busy;

  /** Explicit cancellation abandons this draft and returns without invoking a write. */
  function cancel() {
    reset({ reason: "" });
    router.dismissTo({ pathname: "/matches/[matchId]", params: { matchId } });
  }

  /** Sends one validated private reason, preserving refusals and ignoring obsolete session/route callbacks. */
  async function send(body: CreateStreamReportRequest) {
    if (disabled || reported) {
      return;
    }
    const attempt = command.mutateAsync(body);
    try {
      await attempt;
      reset({ reason: "" });
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      if (error instanceof ApiError && error.status === 422) {
        setError("reason", {
          message: "Le signalement a été refusé. Votre saisie est conservée.",
        });
      } else {
        feedback.error();
      }
    }
  }

  return (
    <Surface>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.title, { color: colors.text }]}
      >
        Signaler ce lien
      </Text>
      {targetUrl && (
        <Text
          style={[
            reported ? tokens.typography.metadata : tokens.typography.body,
            { color: reported ? colors.secondaryText : colors.text },
          ]}
        >
          {targetUrl}
        </Text>
      )}
      {reported ? (
        <View style={styles.reported}>
          <CircleCheck
            accessible={false}
            color={colors.onSuccessSubtle}
            size={tokens.size.icon.md}
          />
          <Text
            accessibilityLiveRegion="polite"
            style={[
              tokens.typography.body,
              styles.reportedMessage,
              { color: colors.text },
            ]}
          >
            {command.data
              ? "Votre signalement a été envoyé."
              : "Vous avez déjà signalé ce lien."}
          </Text>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            Votre motif reste privé et vise uniquement ce lien.
          </Text>
          <Controller
            control={control}
            name="reason"
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label="Motif du signalement"
                multiline
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!command.isPending}
                error={fieldState.error?.message}
              />
            )}
          />
          <Button
            label="Envoyer le signalement"
            fullWidth
            loading={command.isPending}
            disabled={disabled}
            onPress={() => void handleSubmit(send)()}
          />
          <Button
            label="Annuler"
            variant="secondary"
            fullWidth
            disabled={command.isPending}
            onPress={cancel}
          />
        </View>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  hidden: { display: "none" },
  form: { gap: tokens.layout.form.gap },
  reported: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  reportedMessage: { flex: 1 },
});
