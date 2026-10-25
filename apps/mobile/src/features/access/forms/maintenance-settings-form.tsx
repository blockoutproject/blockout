import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import { FileText, Wrench } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { MaintenanceSettingsResponse } from "../../../../.generated/schemas/index.zod";
import {
  maintenanceImageSchema,
  maintenanceSchema,
  maintenanceValues,
  type MaintenanceValues,
} from "./maintenance-values";
import { toMaintenanceRequest } from "../api/maintenance-request";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { TextField } from "../../../shared/components/text-field";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useAccountSession } from "../../accounts/current-account";
import {
  requiresSettingsReread,
  useMaintenanceSettings,
} from "../api/use-maintenance-settings";

/** One editable snapshot; newer remote data cannot silently replace dirty input or its revision. */
export interface MaintenanceSettingsFormProps {
  settings: MaintenanceSettingsResponse;
  editing: ReturnType<typeof useMaintenanceSettings>;
  disabled?: boolean;
}

/** Owns one route-local draft, separating content and activation with explicit conflict/uncertainty reconciliation. */
export function MaintenanceSettingsForm({
  settings,
  editing,
  disabled = false,
}: MaintenanceSettingsFormProps) {
  const session = useAccountSession();
  const { colors } = useTheme();
  const [state, setState] = useState<{
    baseline: MaintenanceSettingsResponse;
    needsRead: boolean;
    feedback?: string;
  }>({ baseline: settings, needsRead: false });
  const { baseline, needsRead, feedback } = state;
  const mounted = useRef(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<MaintenanceValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: maintenanceValues(settings),
  });
  useDiscardChanges(isDirty, () => reset());
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const imageUrl = useWatch({ control, name: "imageUrl" });
  const busy =
    disabled ||
    isSubmitting ||
    editing.content.isPending ||
    editing.activation.isPending ||
    editing.query.isFetching;
  const rereadRequired = needsRead || settings.revision > baseline.revision;
  const validPreview =
    imageUrl !== "" && maintenanceImageSchema.safeParse(imageUrl).success;

  /** Confirms content preparation with the native F13 confirmation, independently of activation. */
  function confirmContent(draft: MaintenanceValues) {
    if (busy || rereadRequired) return;
    Alert.alert("Enregistrer le contenu ?", "L’activation reste inchangée.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Enregistrer",
        onPress: () => {
          if (mounted.current) void submit(draft);
        },
      },
    ]);
  }
  /** Confirms the desired global state using saved content, preserving the editing draft. */
  function confirmActivation() {
    if (busy || rereadRequired) return;
    Alert.alert(
      baseline.active
        ? "Désactiver la maintenance ?"
        : "Activer la maintenance ?",
      "Cette action utilise le contenu enregistré. Votre brouillon est conservé.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: baseline.active ? "Désactiver" : "Activer",
          onPress: () => {
            if (mounted.current) void activate();
          },
        },
      ],
    );
  }

  /** Keeps a failed draft intact; only ambiguous outcomes and conflicts block further writes. */
  function failed(error: unknown) {
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (requiresSettingsReread(error)) {
      setState({
        ...state,
        needsRead: true,
        feedback:
          "Le résultat doit être vérifié. Relisez les réglages avant une nouvelle soumission.",
      });
    } else
      setState({
        ...state,
        feedback:
          "L’enregistrement a été refusé. Vérifiez les valeurs et vos permissions.",
      });
  }
  /** Submits supplied dirty content against its accepted editing revision, without activation. */
  async function submit(draft: MaintenanceValues) {
    if (!session.isCurrent(session.generation) || rereadRequired || busy)
      return;
    try {
      const accepted = await editing.content.mutateAsync(
        toMaintenanceRequest(baseline.revision, draft, dirtyFields),
      );
      if (!mounted.current || !session.isCurrent(session.generation)) return;
      setState({
        baseline: accepted,
        needsRead: false,
        feedback: "Contenu enregistré.",
      });
      reset(maintenanceValues(accepted));
    } catch (error) {
      failed(error);
    }
  }
  /** Changes only the desired global state and leaves the content draft in RHF untouched. */
  async function activate() {
    if (!session.isCurrent(session.generation) || rereadRequired || busy)
      return;
    try {
      const accepted = await editing.activation.mutateAsync({
        revision: baseline.revision,
        active: !baseline.active,
      });
      if (!mounted.current || !session.isCurrent(session.generation)) return;
      setState({
        baseline: accepted,
        needsRead: false,
        feedback: "Activation enregistrée.",
      });
    } catch (error) {
      failed(error);
    }
  }
  /** Rereads the actual outcome without replay; dirty fields remain until an explicit new submit. */
  async function reread() {
    const result = await editing.query.refetch();
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (
      !result.data ||
      result.isError ||
      result.data.revision < baseline.revision
    ) {
      setState({ ...state, needsRead: true, feedback: undefined });
      return;
    }
    setState({
      baseline: result.data,
      needsRead: false,
      feedback:
        "Réglages relus. Vérifiez votre brouillon avant de le soumettre à nouveau.",
    });
    reset(maintenanceValues(result.data), {
      keepDirtyValues: true,
      keepDirty: true,
    });
  }
  return (
    <View style={styles.form}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.heading}>
          <Wrench
            accessible={false}
            size={tokens.size.actionIcon}
            color={colors.icon}
          />
          <View style={styles.state}>
            <Text style={[tokens.typography.strong, { color: colors.text }]}>
              Mode maintenance
            </Text>
            <Text
              accessibilityLabel={
                baseline.active ? "Maintenance active" : "Maintenance inactive"
              }
              style={[
                styles.badge,
                {
                  color: baseline.active
                    ? colors.onWarning
                    : colors.onSuccessSubtle,
                  backgroundColor: baseline.active
                    ? colors.warning
                    : colors.successSubtle,
                },
              ]}
            >
              {baseline.active ? "Activé" : "Désactivé"}
            </Text>
          </View>
        </View>
        <Text style={[tokens.typography.body, { color: colors.text }]}>
          {baseline.active
            ? "L’accès ordinaire à l’application est bloqué."
            : "Aucun blocage de maintenance."}
        </Text>
        <Text style={[tokens.typography.body, { color: colors.secondaryText }]}>
          Cette action utilise le contenu enregistré et conserve votre
          brouillon.
        </Text>
        <Button
          variant={baseline.active ? "secondary" : "success"}
          fullWidth
          label={
            baseline.active
              ? "Désactiver la maintenance"
              : "Activer la maintenance"
          }
          onPress={confirmActivation}
          disabled={busy || rereadRequired}
          loading={editing.activation.isPending}
        />
      </View>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.heading}>
          <FileText
            accessible={false}
            size={tokens.size.actionIcon}
            color={colors.icon}
          />
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            Écran affiché
          </Text>
        </View>
        <Controller
          control={control}
          name="message"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <TextField
              ref={ref}
              label="Message de maintenance"
              multiline
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!busy}
              error={errors.message?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="imageUrl"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <TextField
              ref={ref}
              label="URL de l’image"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="url"
              editable={!busy}
              error={errors.imageUrl?.message}
              helper="Facultatif. Une image HTTPS publique, sans identifiant ni suivi personnalisé. Videz le champ pour la retirer."
            />
          )}
        />
        {validPreview && (
          <MaintenanceImagePreview key={imageUrl} uri={imageUrl} />
        )}
        {isDirty && (
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            Modifications non enregistrées
          </Text>
        )}
        <Button
          fullWidth
          label="Enregistrer le contenu"
          onPress={() => void handleSubmit(confirmContent)()}
          disabled={busy || rereadRequired}
          loading={isSubmitting || editing.content.isPending}
        />
      </View>
      {feedback && (
        <Text
          accessibilityLiveRegion="polite"
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {feedback}
        </Text>
      )}
      {rereadRequired && (
        <Button
          label="Relire les réglages"
          onPress={() => void reread()}
          loading={editing.query.isFetching}
          disabled={busy}
        />
      )}
    </View>
  );
}

/** A validated draft image owns feedback only for its current mounted decode attempt. */
function MaintenanceImagePreview({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <RequestError message="L’image ne peut pas être affichée." />
  ) : (
    <Image
      accessible
      accessibilityLabel="Aperçu de l’image de maintenance"
      source={{ uri }}
      style={styles.preview}
      contentFit="contain"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.compact,
  },
  state: { gap: tokens.spacing.sm, flex: 1 },
  badge: {
    ...tokens.typography.metadata,
    alignSelf: "flex-start",
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.badge,
  },
  form: { gap: tokens.spacing.lg },
  card: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
    borderRadius: tokens.radius.sheet,
    borderWidth: tokens.borderWidth,
  },
  preview: { width: "100%", height: tokens.size.multiline },
} as const);
