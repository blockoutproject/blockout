import { isResourceReadRefused } from "@/shared/api/access-denied";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useForm, useFormState } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import type {
  OwnStreamContributionResponse,
  OwnStreamContributionsResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "@/shared/api/api-fetch";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { Surface } from "@/shared/components/surface";
import { useActionConfirmation } from "@/shared/forms/use-action-confirmation";
import { useDiscardChanges } from "@/shared/forms/use-discard-changes";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { type useOwnContributions } from "../api/own-contributions";
import {
  contributionSchema,
  type ContributionValues,
} from "../schemas/contribution-schema";
import {
  ContributionUrlField,
  ContributionWithdrawalButton,
} from "./contribution-form-controls";
import { contributionValues } from "./contribution-values";

/** One mounted original-match address draft; normal RHF lifetime ends when the route is removed. */
export interface ContributionFormProps {
  matchId: string;
  current: OwnStreamContributionsResponse;
  editing: ReturnType<typeof useOwnContributions>;
  /** Current private active projection; pristine fields follow accepted version changes without replacing dirty drafts. */
  replacement?: OwnStreamContributionResponse;
}

/** Retains the ordinary address editor through scoped read failures; sensitive withdrawal alone requires native confirmation. */
export function ContributionForm({
  matchId,
  current,
  editing,
  replacement,
}: Readonly<ContributionFormProps>) {
  const { colors } = useTheme();
  const router = useRouter();
  const feedback = useActionFeedback({ retainSuccessOnUnmount: true });
  const confirmAction = useActionConfirmation();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { control, handleSubmit, reset, setError, getFieldState } =
    useForm<ContributionValues>({
      resolver: zodResolver(contributionSchema),
      defaultValues: contributionValues(replacement?.url),
    });
  const { isDirty } = useFormState({ control });
  useEffect(() => {
    // RHF owns dirtiness during this mounted visit; only a pristine field follows a newly accepted active version.
    if (replacement && !getFieldState("url").isDirty) {
      reset(contributionValues(replacement.url));
    }
  }, [getFieldState, replacement, reset]);
  useDiscardChanges(isDirty, () => {
    reset(contributionValues());
  });
  const { submit, change, query } = editing;
  const busy = submit.isPending || change.isPending;
  const refused = isResourceReadRefused(query.error);
  const withdrawalDisabled = !editing.canRetain || refused || busy;
  const disabled =
    !editing.canRetain || refused || !current.eligibility.canSubmit;

  /** Acknowledges the saved address before leaving for the exact match, without abandoning a dirty form. */
  function finish(url: string, message: string) {
    if (mounted.current) {
      reset(contributionValues(url));
      feedback.success(message);
      router.dismissTo({ pathname: "/matches/[matchId]", params: { matchId } });
    }
  }

  /** Sends the validated literal and viewed revision directly; failures preserve the draft. */
  async function send(values: ContributionValues) {
    if (busy || disabled) {
      return;
    }
    const body = { revision: current.revision, url: values.url };
    feedback.clear();
    const attempt = submit.mutateAsync(body);
    try {
      const accepted = await attempt;
      const { url, state } = accepted.contribution;
      finish(
        url,
        state === "pending"
          ? "Votre lien est en attente de validation."
          : "Votre lien est publié.",
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setError("url", {
          message: "Le lien a été refusé. Votre saisie est conservée.",
        });
      } else {
        feedback.error();
      }
    }
  }

  /** Withdraws the exact displayed published version independently of eligibility for a new proposal. */
  async function withdraw() {
    if (!replacement?.canWithdraw || withdrawalDisabled) {
      return;
    }
    const target = {
      versionId: replacement.id,
      body: { action: "withdraw" as const },
    };
    const confirmed = await confirmAction({
      title: "Retirer ce lien ?",
      message: `${replacement.url}\n\nSeule cette version est retirée. Votre proposition éventuelle reste en attente. Cette action ne restitue aucun quota consommé.`,
      confirmLabel: "Retirer le lien",
      cancelLabel: "Conserver",
      destructive: true,
    });
    if (!confirmed || !mounted.current) {
      return;
    }
    feedback.clear();
    const attempt = change.mutateAsync(target);
    try {
      const accepted = await attempt;
      finish(accepted.contribution.url, "Lien retiré.");
    } catch {
      feedback.error();
    }
  }

  return (
    <Surface>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {replacement ? "Votre lien public" : "Proposer un lien"}
        </Text>
        {replacement?.canWithdraw && (
          <ContributionWithdrawalButton
            disabled={withdrawalDisabled}
            onPress={() => void withdraw()}
          />
        )}
      </View>
      <View style={styles.form}>
        <ContributionUrlField control={control} editable={!busy} />
        {current.eligibility.requiresApproval && (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Ce lien sera soumis à validation.
          </Text>
        )}

        <Button
          label={replacement ? "Remplacer le lien" : "Soumettre le lien"}
          fullWidth
          onPress={() => void handleSubmit(send)()}
          disabled={disabled || busy}
          loading={submit.isPending}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  title: { ...tokens.typography.title, flex: 1 },
});
