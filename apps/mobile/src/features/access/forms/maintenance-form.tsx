import { ImageFallback } from "@/shared/components/image-fallback";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { useDiscardChanges } from "@/shared/forms/use-discard-changes";
import { useSettingsSaveFeedback } from "./use-settings-save-feedback";
import { useActionConfirmation } from "@/shared/forms/use-action-confirmation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import { FileText, Wrench } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm, useFormState, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import type { MaintenanceSettingsResponse } from "../../../../.generated/schemas/index.zod";
import {
  maintenanceImageSchema,
  maintenanceSchema,
  type MaintenanceValues,
} from "../schemas/maintenance-schema";
import { maintenanceValues } from "./maintenance-values";
import { toMaintenanceRequest } from "../api/maintenance-request";
import { Button } from "@/shared/components/button";
import { TextField } from "@/shared/components/text-field";
import { Surface } from "@/shared/components/surface";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { type useMaintenanceSettings } from "../api/use-maintenance-settings";

/** One editable snapshot; newer remote data cannot silently replace dirty input. */
export interface MaintenanceFormProps {
  settings: MaintenanceSettingsResponse;
  editing: ReturnType<typeof useMaintenanceSettings>;
  disabled?: boolean;
}

/** Owns one route-local content draft and independent activation, preserving typed input across refusals. */
export function MaintenanceForm({
  settings,
  editing,
  disabled = false,
}: Readonly<MaintenanceFormProps>) {
  const { colors } = useTheme();
  const confirmAction = useActionConfirmation();
  const { control, handleSubmit, reset } = useForm<MaintenanceValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: maintenanceValues(settings),
  });
  const { isDirty, dirtyFields } = useFormState({ control });
  const disablePrevention = useDiscardChanges(isDirty, () => reset());
  const actionFeedback = useSettingsSaveFeedback(disablePrevention);
  const imageUrl = useWatch({ control, name: "imageUrl" });
  const busy =
    disabled || editing.content.isPending || editing.activation.isPending;
  const validPreview =
    imageUrl !== "" && maintenanceImageSchema.safeParse(imageUrl).success;

  /** Submits supplied dirty content without changing activation. */
  function submit(draft: MaintenanceValues) {
    if (busy) {
      return;
    }
    actionFeedback.clear();
    editing.content.mutate(toMaintenanceRequest(draft, dirtyFields), {
      onSuccess(accepted) {
        actionFeedback.saved(() => reset(maintenanceValues(accepted)));
      },
      onError: () => actionFeedback.error(),
    });
  }

  /** Changes only the desired global state and leaves the content draft in RHF untouched. */
  async function activate() {
    if (busy) {
      return;
    }
    if (
      !(await confirmAction({
        title: settings.active
          ? "Désactiver la maintenance ?"
          : "Activer la maintenance ?",
        message:
          "Cette action utilise le contenu enregistré. Votre brouillon est conservé.",
        confirmLabel: settings.active ? "Désactiver" : "Activer",
      }))
    ) {
      return;
    }
    actionFeedback.clear();
    try {
      await editing.activation.mutateAsync({
        active: !settings.active,
      });
    } catch {
      actionFeedback.error();
    }
  }

  return (
    <View style={styles.form}>
      <Surface>
        <View style={styles.form}>
          <View style={styles.heading}>
            <Wrench
              accessible={false}
              size={tokens.size.icon.lg}
              color={colors.icon}
            />
            <View style={styles.state}>
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                Mode maintenance
              </Text>
              <Text
                accessibilityLabel={
                  settings.active
                    ? "Maintenance active"
                    : "Maintenance inactive"
                }
                style={[
                  styles.badge,
                  {
                    color: settings.active
                      ? colors.onWarning
                      : colors.onSuccessSubtle,
                    backgroundColor: settings.active
                      ? colors.warning
                      : colors.successSubtle,
                  },
                ]}
              >
                {settings.active ? "Activé" : "Désactivé"}
              </Text>
            </View>
          </View>
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            {settings.active
              ? "L’accès ordinaire à l’application est bloqué."
              : "Aucun blocage de maintenance."}
          </Text>
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Cette action utilise le contenu enregistré et conserve votre
            brouillon.
          </Text>
          <Button
            variant={settings.active ? "secondary" : "success"}
            fullWidth
            label={
              settings.active
                ? "Désactiver la maintenance"
                : "Activer la maintenance"
            }
            onPress={() => void activate()}
            disabled={busy}
            loading={editing.activation.isPending}
          />
        </View>
      </Surface>
      <Surface>
        <View style={styles.form}>
          <View style={styles.heading}>
            <FileText
              accessible={false}
              size={tokens.size.icon.lg}
              color={colors.icon}
            />
            <Text style={[tokens.typography.strong, { color: colors.text }]}>
              Écran affiché
            </Text>
          </View>
          <Controller
            control={control}
            name="message"
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label="Message de maintenance"
                multiline
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!busy}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="imageUrl"
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label="URL de l’image"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="url"
                editable={!busy}
                error={fieldState.error?.message}
                helper="Facultatif. Une image HTTPS publique, sans identifiant ni suivi personnalisé. Videz le champ pour la retirer."
              />
            )}
          />
          <MaintenanceImagePreview
            key={imageUrl}
            uri={validPreview ? imageUrl : undefined}
          />
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
            label="Enregistrer"
            onPress={() => void handleSubmit(submit)()}
            disabled={busy}
            loading={editing.content.isPending}
          />
        </View>
      </Surface>
    </View>
  );
}

/** Keeps the nominal slot without a usable URL; only a validated URL starts native loading, independently of RHF. */
function MaintenanceImagePreview({ uri }: Readonly<{ uri?: string }>) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<"loading" | "displayed" | "failed">(
    "loading",
  );
  return (
    <View
      style={[styles.preview, { backgroundColor: colors.mediaPlaceholder }]}
    >
      {!uri || status === "failed" ? (
        <ImageFallback label={uri ? "Aperçu indisponible" : "Aperçu absent"} />
      ) : (
        <Image
          accessible
          accessibilityRole="image"
          accessibilityLabel="Aperçu de l’image de maintenance"
          source={{ uri }}
          contentFit="contain"
          style={[StyleSheet.absoluteFill, styles.previewImage]}
          onDisplay={() => setStatus("displayed")}
          onError={() => setStatus("failed")}
        />
      )}
      {uri && status === "loading" && (
        <LoadingGroup
          label="Chargement de l’aperçu"
          style={StyleSheet.absoluteFill}
        >
          <Skeleton
            height="100%"
            shape="rectangle"
            radius={tokens.media.radius.profile}
          />
        </LoadingGroup>
      )}
    </View>
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
    borderRadius: tokens.radius.sm,
  },
  form: { gap: tokens.layout.form.gap },
  // The URL image preview has its own bounded 96-point viewport, independent of text-entry controls.
  preview: {
    width: "100%",
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.media.radius.profile,
    overflow: "hidden",
  },
  previewImage: { borderRadius: tokens.media.radius.profile },
} as const);
