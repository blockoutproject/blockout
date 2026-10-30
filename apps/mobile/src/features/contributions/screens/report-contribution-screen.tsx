import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import type {
  CreateStreamReportRequest,
  MatchDetailResponse,
} from "../../../../.generated/schemas/index.zod";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { Page, PageContent } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { Surface } from "../../../shared/components/surface";
import { TextField } from "../../../shared/components/text-field";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  MatchSummary,
  useConsultationQueries,
} from "../../sporting/match-consultation";
import { useContributionReport } from "../api/contribution-reports";
import { reportEditor } from "../forms/report-editor";

/** Captured F03 identity; refreshing may reveal a replacement but never retargets this form. */
export interface ReportContributionScreenProps {
  matchId: string;
  contributionId: string;
}
const reasonSchema = z.object({
  reason: z.string().trim().min(1, "Indiquez le motif du signalement."),
});

/** Ordinary native report route; F05 invitation carries no continuation and F10 support stays separate. */
export function ReportContributionScreen({
  matchId,
  contributionId,
}: ReportContributionScreenProps) {
  const reporting = useContributionReport(matchId, contributionId);
  const match = useQuery(useConsultationQueries().match(matchId));
  const router = useRouter();
  const authenticated = reporting.session.status === "authenticated";
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title="Lien de diffusion" />}>
        {({ onScroll, headerHeight }) => (
          <FormScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
          >
            {reporting.session.status === "guest" ? (
              <ScreenState>
                <Button
                  label="Se connecter"
                  onPress={() =>
                    router.push({
                      pathname: "/sign-in-invitation",
                      params: { reason: "stream-report" },
                    })
                  }
                />
              </ScreenState>
            ) : !authenticated || !reporting.profile.data ? (
              <ScreenState>
                <ReadFeedback query={reporting.profile} />
              </ScreenState>
            ) : !reporting.query.data ? (
              <ScreenState>
                <ReadFeedback query={reporting.query} />
              </ScreenState>
            ) : (
              <PageContent>
                {match.data && (
                  <MatchSummary
                    match={match.data.match}
                    presentation="context"
                  />
                )}
                <ReportForm
                  key={`${reporting.session.generation}:${contributionId}`}
                  matchId={matchId}
                  contributionId={contributionId}
                  reporting={reporting}
                  match={match}
                />
              </PageContent>
            )}
          </FormScrollView>
        )}
      </ScrollChrome>
    </Page>
  );
}

/** Native form on approved report node 5534:59410; its retained reason always belongs to the viewed version. */
function ReportForm({
  matchId,
  contributionId,
  reporting,
  match,
}: ReportContributionScreenProps & {
  reporting: ReturnType<typeof useContributionReport>;
  match: UseQueryResult<MatchDetailResponse>;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const feedback = useActionFeedback();
  const { session, command, query } = reporting;
  const [editor] = useState(() => reportEditor(session, contributionId));
  const mounted = useRef(true);
  const { control, handleSubmit, reset, setError } =
    useForm<CreateStreamReportRequest>({
      resolver: zodResolver(reasonSchema),
      formControl: editor.form.formControl,
    });
  const { isDirty } = useFormState({ control });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (!editor.form.getFieldState("reason").isDirty) editor.release();
    };
  }, [editor]);
  useDiscardChanges(isDirty, () => {
    reset({ reason: "" });
    editor.release();
  });
  const currentTarget =
    match.isSuccess &&
    match.data?.streamContributionId === contributionId &&
    !!match.data.streamUrl;
  const reported = query.data?.reported === true;
  const conflict =
    command.error instanceof ApiError && command.error.status === 409;
  const uncertain = isUncertainMutationFailure(command.error);
  const busy = command.pending || match.isFetching;

  /** Explicit cancellation abandons this draft and returns without invoking a write. */
  function cancel() {
    reset({ reason: "" });
    editor.release();
    router.dismissTo({ pathname: "/matches/[matchId]", params: { matchId } });
  }
  /** Refreshes only public context after an obsolete target; the captured version and draft stay fixed. */
  async function refreshMatch() {
    const result = await match.refetch({ cancelRefetch: false });
    if (
      result.isError &&
      mounted.current &&
      session.isCurrent(session.generation)
    )
      feedback.error();
  }
  /** Sends one validated private reason, preserving refusals and ignoring obsolete session/route callbacks. */
  async function send(body: CreateStreamReportRequest) {
    if (
      !currentTarget ||
      !reporting.usable ||
      query.isError ||
      busy ||
      reported ||
      command.needsRead
    )
      return;
    const attempt = command.start(body);
    if (!attempt) return;
    try {
      await attempt;
      if (!session.isCurrent(session.generation)) return;
      reset({ reason: "" });
      if (mounted.current) editor.release();
    } catch (error) {
      if (!mounted.current || !session.isCurrent(session.generation)) return;
      if (error instanceof ApiError && error.status === 422)
        setError("reason", {
          message: "Le signalement a été refusé. Votre saisie est conservée.",
        });
      else if (
        !(error instanceof ApiError && error.status === 409) &&
        !isUncertainMutationFailure(error)
      )
        feedback.error(
          "Le signalement est indisponible. Votre saisie est conservée.",
        );
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
      {currentTarget && (
        <Text style={[tokens.typography.body, { color: colors.text }]}>
          {match.data?.streamUrl}
        </Text>
      )}
      {reported ? (
        <>
          <Text
            accessibilityLiveRegion="polite"
            style={[tokens.typography.body, { color: colors.text }]}
          >
            {command.data
              ? "Votre signalement a été envoyé."
              : "Vous avez déjà signalé ce lien."}
          </Text>
          <Button label="Retour au match" onPress={cancel} />
        </>
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
                editable={!command.pending}
                error={fieldState.error?.message}
              />
            )}
          />
          {!currentTarget && match.isSuccess && (
            <Text
              accessibilityLiveRegion="polite"
              style={[tokens.typography.body, { color: colors.text }]}
            >
              Ce lien n’est plus public. Revenez au match avant une nouvelle
              action.
            </Text>
          )}
          {conflict && (
            <>
              <Text
                accessibilityLiveRegion="polite"
                style={[tokens.typography.body, { color: colors.text }]}
              >
                Le lien a changé. Actualisez le match avant une nouvelle action.
                Votre saisie est conservée.
              </Text>
              <Button
                label="Actualiser le match"
                loading={match.isFetching}
                onPress={() => void refreshMatch()}
              />
            </>
          )}
          {uncertain && (
            <Text
              accessibilityLiveRegion="polite"
              style={[tokens.typography.body, { color: colors.text }]}
            >
              Le résultat reste incertain. Revenez au match pour vérifier l’état
              courant avant une nouvelle action. Votre saisie est conservée.
            </Text>
          )}
          {match.isError && <ReadFeedback query={match} />}
          <Button
            label="Envoyer le signalement"
            fullWidth
            loading={command.executing}
            disabled={
              !reporting.usable ||
              query.isError ||
              !currentTarget ||
              busy ||
              command.needsRead
            }
            onPress={() => void handleSubmit(send)()}
          />
          <Button
            label="Annuler"
            variant="secondary"
            fullWidth
            disabled={command.pending}
            onPress={cancel}
          />
        </View>
      )}
    </Surface>
  );
}
const styles = StyleSheet.create({ form: { gap: tokens.layout.form.gap } });
