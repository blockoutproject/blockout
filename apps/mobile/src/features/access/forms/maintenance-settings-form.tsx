import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import { FileText, Wrench } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import type {
  MaintenanceSettingsResponse,
  ChangeMaintenanceRequest,
} from "../../../../.generated/schemas/index.zod";
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

const imageSchema = z.string().refine((value) => {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Utilisez une URL HTTPS d’image sans identifiant ni suivi personnalisé.");
const schema = z.object({
  message: z.string().trim().min(1, "Saisissez un message de maintenance."),
  imageUrl: imageSchema,
});
type MaintenanceValues = z.infer<typeof schema>;

/** One editable snapshot; newer remote data cannot silently replace dirty input or its revision. */
export interface MaintenanceSettingsFormProps {
  settings: MaintenanceSettingsResponse;
  editing: ReturnType<typeof useMaintenanceSettings>;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Separates content and activation and requires explicit reconciliation after conflict or uncertainty. */
export function MaintenanceSettingsForm({
  settings,
  editing,
  disabled = false,
  onDirtyChange,
}: MaintenanceSettingsFormProps) {
  const session = useAccountSession();
  const { colors } = useTheme();
  const [baseline, setBaseline] = useState(settings);
  const [needsRead, setNeedsRead] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const [previewFailure, setPreviewFailure] = useState<string>();
  const {
    control,
    handleSubmit,
    reset,
    getFieldState,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<MaintenanceValues>({
    resolver: zodResolver(schema),
    defaultValues: values(settings),
  });
  const imageUrl = useWatch({ control, name: "imageUrl" });
  const busy =
    disabled ||
    isSubmitting ||
    editing.content.isPending ||
    editing.activation.isPending ||
    editing.query.isFetching;
  const rereadRequired = needsRead || settings.revision > baseline.revision;
  const validPreview =
    imageUrl !== "" && imageSchema.safeParse(imageUrl).success;
  // Subscribe to dirty fields so RHF's documented keepDirtyValues reconciliation retains them.
  const dirty = Object.keys(dirtyFields).length > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  /** Confirms content preparation with the native F13 confirmation, independently of activation. */
  function confirmContent(draft: MaintenanceValues) {
    if (busy || rereadRequired) return;
    Alert.alert("Enregistrer le contenu ?", "L’activation reste inchangée.", [
      { text: "Annuler", style: "cancel" },
      { text: "Enregistrer", onPress: () => void submit(draft) },
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
          onPress: () => void activate(),
        },
      ],
    );
  }

  /** Keeps a failed draft intact; only ambiguous outcomes and conflicts block further writes. */
  function failed(error: unknown) {
    if (!session.isCurrent(session.generation)) return;
    if (requiresSettingsReread(error)) {
      setNeedsRead(true);
      setFeedback(
        "Le résultat doit être vérifié. Relisez les réglages avant une nouvelle soumission.",
      );
    } else
      setFeedback(
        "L’enregistrement a été refusé. Vérifiez les valeurs et vos permissions.",
      );
  }
  /** Submits supplied dirty content against its accepted editing revision, without activation. */
  async function submit(draft: MaintenanceValues) {
    if (!session.isCurrent(session.generation) || rereadRequired || busy)
      return;
    const body: ChangeMaintenanceRequest = { revision: baseline.revision };
    if (getFieldState("message").isDirty) body.message = draft.message;
    if (getFieldState("imageUrl").isDirty)
      body.imageUrl = draft.imageUrl === "" ? null : draft.imageUrl;
    try {
      const accepted = await editing.content.mutateAsync(body);
      if (!session.isCurrent(session.generation)) return;
      setBaseline(accepted);
      reset(values(accepted));
      setFeedback("Contenu enregistré.");
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
      if (!session.isCurrent(session.generation)) return;
      setBaseline(accepted);
      setFeedback("Activation enregistrée.");
    } catch (error) {
      failed(error);
    }
  }
  /** Rereads the actual outcome without replay; dirty fields remain until an explicit new submit. */
  async function reread() {
    const result = await editing.query.refetch();
    if (!session.isCurrent(session.generation)) return;
    if (
      !result.data ||
      result.isError ||
      result.data.revision < baseline.revision
    ) {
      setNeedsRead(true);
      setFeedback(undefined);
      return;
    }
    setBaseline(result.data);
    reset(values(result.data), { keepDirtyValues: true });
    setNeedsRead(false);
    setFeedback(
      "Réglages relus. Vérifiez votre brouillon avant de le soumettre à nouveau.",
    );
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
        {validPreview && previewFailure !== imageUrl && (
          <Image
            accessible
            accessibilityLabel="Aperçu de l’image de maintenance"
            source={{ uri: imageUrl }}
            style={styles.preview}
            contentFit="contain"
            onError={() => setPreviewFailure(imageUrl)}
          />
        )}
        {validPreview && previewFailure === imageUrl && (
          <RequestError message="L’image ne peut pas être affichée." />
        )}
        {dirty && (
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
          loading={isSubmitting}
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
/** Maps optional transport media into the form's explicit empty editing value. */
function values(settings: MaintenanceSettingsResponse): MaintenanceValues {
  return { message: settings.message, imageUrl: settings.imageUrl ?? "" };
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
});
