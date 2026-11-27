import { zodResolver } from "@hookform/resolvers/zod";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import { ArrowUpRight } from "lucide-react-native";
import { useForm, useFormState } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import type { ModeratedStreamContributionsResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "@/shared/api/api-fetch";
import { isAccessDenied } from "@/shared/api/access-denied";
import { Button } from "@/shared/components/button";
import { IconButton } from "@/shared/components/icon-button";
import { useNativeHandoff } from "@/shared/native/use-native-handoff";
import { Surface } from "@/shared/components/surface";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { useDiscardChanges } from "@/shared/forms/use-discard-changes";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import type { useModerationMatch } from "../api/moderation";
import {
  contributionSchema,
  type ContributionValues,
} from "../schemas/contribution-schema";
import {
  ContributionUrlField,
  ContributionWithdrawalButton,
} from "./contribution-form-controls";
import { contributionValues } from "./contribution-values";
import { ContributionStateBadge } from "../components/contribution-state-badge";
import {
  contributionStateLabels,
  streamPlatformLabels,
} from "../model/moderation-presentation";

/** The active pager scene retains one ordinary RHF address editor and its original dirty baseline. */
export interface ModerationPublicationFormProps {
  current: ModeratedStreamContributionsResponse | undefined;
  editing: ReturnType<typeof useModerationMatch>;
  onWithdraw: () => void;
  onSuccess: () => void;
  children?: ReactNode;
  ref?: Ref<ModerationPublicationFormHandle>;
}

/** The active scene's explicit pull gesture may adopt a new viewed baseline without replacing dirty RHF input. */
export interface ModerationPublicationFormHandle {
  refresh: () => Promise<void>;
}

/** The active link can be opened or withdrawn independently of the moderator's publication draft. */
export function ModerationPublicationForm({
  current,
  editing,
  onWithdraw,
  onSuccess,
  children,
  ref,
}: Readonly<ModerationPublicationFormProps>) {
  const { colors } = useTheme();
  const active = current?.activeContribution;
  const handoff = useNativeHandoff(active?.url);
  const revision = useRef(current?.revision);
  const feedback = useActionFeedback();
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
      defaultValues: contributionValues(active?.url),
    });
  const { isDirty } = useFormState({ control });
  useEffect(() => {
    // As in the personal editor, accepted changes update only pristine fields; a dirty draft keeps its baseline.
    if (current && !getFieldState("url").isDirty) {
      revision.current = current.revision;
      reset(contributionValues(active?.url));
    }
  }, [current, active?.url, getFieldState, reset]);
  useDiscardChanges(isDirty, () => reset(contributionValues()));
  useImperativeHandle(ref, () => ({
    /** A successful user-requested read starts a new intentional revision; background reads keep the dirty baseline. */
    async refresh() {
      const [read] = await editing.refresh();
      revision.current = read.pages[0].revision;
    },
  }));
  const busy =
    editing.publish.isPending ||
    editing.change.isPending ||
    editing.reactivate.isPending;
  const refused =
    isAccessDenied(editing.query.error) ||
    (editing.query.error instanceof ApiError &&
      editing.query.error.status === 404);
  const disabled = !editing.canRetain || !current?.canPublish || refused;
  const withdrawalDisabled = !editing.canRetain || busy || refused;

  /** Sends the ordinary publication directly with its original actor and dirty draft's viewed revision. */
  async function send(values: ContributionValues) {
    const actorAccountId = editing.session.accountId;
    if (!actorAccountId || !revision.current || busy || disabled) {
      return;
    }
    const body = {
      actorAccountId,
      revision: revision.current,
      url: values.url,
    };
    feedback.clear();
    try {
      const result = await editing.publish.mutateAsync(body);
      if (mounted.current) {
        revision.current = result.revision;
        reset(contributionValues(result.contribution.url));
        onSuccess();
      }
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

  return (
    <Surface style={{ backgroundColor: colors.insetSurface, borderWidth: 0 }}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.text }]}
          >
            {active ? streamPlatformLabels[active.platform] : "Publier un lien"}
          </Text>
          {active && (
            <ContributionStateBadge
              state={active.state}
              label={contributionStateLabels[active.state]}
            />
          )}
        </View>
        {active && (
          <IconButton
            label={`Ouvrir ${active.url}`}
            loading={handoff.pending}
            onPress={() => void handoff.open()}
          >
            <ArrowUpRight color={colors.icon} size={tokens.size.icon.md} />
          </IconButton>
        )}
        {active?.canWithdraw && (
          <ContributionWithdrawalButton
            disabled={withdrawalDisabled}
            onPress={onWithdraw}
          />
        )}
      </View>
      <View style={styles.form}>
        <ContributionUrlField
          control={control}
          editable={!busy && !!current?.canPublish}
        />
        {current && !current.canPublish && (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            La publication n’est pas autorisée pour ce match.
          </Text>
        )}
        <Button
          label={active ? "Remplacer le lien" : "Publier le lien"}
          fullWidth
          loading={editing.publish.isPending}
          disabled={disabled || busy}
          onPress={() => void handleSubmit(send)()}
        />
      </View>
      {children}
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
  identity: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  title: tokens.typography.title,
});
