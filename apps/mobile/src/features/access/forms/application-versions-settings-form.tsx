import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationVersionsEditor,
  applicationVersionsValues as values,
} from "./application-versions-editor";
import { applicationUpdateMessage } from "../application-update-message";
import { ChevronDown, ChevronRight, Check } from "lucide-react-native";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type {
  ApplicationVersionsResponse,
  ChangeApplicationVersionsRequest,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { TextField } from "../../../shared/components/text-field";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useAccountSession } from "../../accounts/current-account";
import { useApplicationVersionsSettings } from "../api/use-application-versions-settings";
import { requiresSettingsReread } from "../api/use-maintenance-settings";
import {
  applicationVersionsSchema,
  raisesMinimum,
  type ApplicationVersionsValues,
} from "../schemas/application-versions-settings";
import { ApplicationVersionsPreview } from "../screens/access-gate-screen";

/** Keeps one editable group revision and a local draft; only explicit reread reconciles newer server data. */
export interface ApplicationVersionsSettingsFormProps {
  settings: ApplicationVersionsResponse;
  editing: ReturnType<typeof useApplicationVersionsSettings>;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Publishes atomic dirty-field changes without changing maintenance or replaying uncertain writes. */
export function ApplicationVersionsSettingsForm({
  settings,
  editing,
  disabled = false,
  onDirtyChange,
}: ApplicationVersionsSettingsFormProps) {
  const session = useAccountSession();
  const { colors } = useTheme();
  const [editor] = useState(() => applicationVersionsEditor(session, settings));
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline, needsRead, feedback } = state;
  const [expanded, setExpanded] = useState({ ios: false, android: false });
  const [preview, setPreview] = useState(false);
  const [acknowledged, setAcknowledged] = useState<string>();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<ApplicationVersionsValues>({
    formControl: editor.form.formControl,
    resolver: zodResolver(applicationVersionsSchema),
  });
  const [iosMinimum, iosStore, androidMinimum, androidStore, message] =
    useWatch({
      control,
      name: [
        "ios.minimumVersion",
        "ios.storeUrl",
        "android.minimumVersion",
        "android.storeUrl",
        "message",
      ],
    });
  const current: ApplicationVersionsValues = {
    ios: { minimumVersion: iosMinimum, storeUrl: iosStore },
    android: { minimumVersion: androidMinimum, storeUrl: androidStore },
    message,
  };
  const raised = raisesMinimum(current, baseline);
  const storeChoice = JSON.stringify([current.ios, current.android]);
  const checked = acknowledged === storeChoice;
  const busy =
    disabled ||
    isSubmitting ||
    editing.content.isPending ||
    editing.query.isFetching;
  const rereadRequired = needsRead || settings.revision > baseline.revision;
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  /** Native confirmation applies one reviewed draft; raising a minimum needs explicit store verification. */
  function confirm(draft: ApplicationVersionsValues) {
    if (busy || rereadRequired || (raised && !checked)) return;
    Alert.alert(
      "Appliquer les modifications ?",
      "Les réglages de maintenance restent inchangés.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Appliquer", onPress: () => void submit(draft) },
      ],
    );
  }
  /** Maps only dirty fields, with null removals, into the generated atomic PATCH. */
  async function submit(draft: ApplicationVersionsValues) {
    if (!session.isCurrent(session.generation) || busy || rereadRequired)
      return;
    const body: ChangeApplicationVersionsRequest = {
      revision: baseline.revision,
    };
    for (const platform of ["ios", "android"] as const) {
      const dirty = dirtyFields[platform];
      if (!dirty?.minimumVersion && !dirty?.storeUrl) continue;
      body[platform] = {};
      if (dirty.minimumVersion)
        body[platform].minimumVersion = draft[platform].minimumVersion || null;
      if (dirty.storeUrl)
        body[platform].storeUrl = draft[platform].storeUrl || null;
    }
    if (dirtyFields.message) body.message = draft.message || null;
    try {
      const accepted = await editing.content.mutateAsync(body);
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        baseline: accepted,
        needsRead: false,
        feedback: "Réglages de versions enregistrés.",
      });
      reset(values(accepted));
      setAcknowledged(undefined);
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      if (requiresSettingsReread(error)) {
        editor.update({
          ...state,
          needsRead: true,
          feedback:
            "Le résultat doit être vérifié. Relisez les réglages avant une nouvelle soumission.",
        });
      } else
        editor.update({
          ...state,
          feedback:
            "L’enregistrement a été refusé. Vérifiez les valeurs et vos permissions.",
        });
    }
  }
  /** Reads the actual outcome and keeps dirty fields, without submitting or merging conflicting input. */
  async function reread() {
    const result = await editing.query.refetch();
    if (!session.isCurrent(session.generation)) return;
    if (
      !result.data ||
      result.isError ||
      result.data.revision < baseline.revision
    ) {
      editor.update({ ...state, needsRead: true, feedback: undefined });
      return;
    }
    editor.update({
      baseline: result.data,
      needsRead: false,
      feedback:
        "Réglages relus. Vérifiez votre brouillon avant de le soumettre à nouveau.",
    });
    reset(values(result.data), { keepDirtyValues: true });
    setAcknowledged(undefined);
  }
  return (
    <View style={styles.form}>
      {(["ios", "android"] as const).map((platform) => {
        const ios = platform === "ios";
        const name = ios ? "iOS" : "Android";
        const open = expanded[platform];
        const Chevron = open ? ChevronDown : ChevronRight;
        return (
          <View
            key={platform}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={name}
              accessibilityState={{ expanded: open }}
              onPress={() => setExpanded({ ...expanded, [platform]: !open })}
              style={styles.disclosure}
            >
              <Text style={[styles.platform, { color: colors.text }]}>
                {name}
              </Text>
              <Text style={[styles.minimum, { color: colors.secondaryText }]}>
                {current[platform].minimumVersion || "Aucun minimum"}
              </Text>
              <Chevron
                accessible={false}
                size={tokens.size.controlIcon}
                color={colors.icon}
              />
            </Pressable>
            <View
              style={!open && styles.hidden}
              accessibilityElementsHidden={!open}
              importantForAccessibility={open ? "auto" : "no-hide-descendants"}
            >
              <View style={styles.form}>
                <Controller
                  control={control}
                  name={`${platform}.minimumVersion`}
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <TextField
                      ref={ref}
                      label={`Version minimale ${name}`}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!busy}
                      error={errors[platform]?.minimumVersion?.message}
                      helper="Facultatif. Trois nombres, par exemple 2.10.0. Videz le champ pour retirer le minimum."
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`${platform}.storeUrl`}
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <TextField
                      ref={ref}
                      label={
                        ios ? "URL App Store iOS" : "URL Google Play Android"
                      }
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="none"
                      autoCorrect={false}
                      inputMode="url"
                      editable={!busy}
                      error={errors[platform]?.storeUrl?.message}
                      helper="Lien requis si une version minimale est imposée."
                    />
                  )}
                />
              </View>
            </View>
          </View>
        );
      })}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[tokens.typography.heading, { color: colors.text }]}
        >
          Contenu affiché
        </Text>
        <Controller
          control={control}
          name="message"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <TextField
              ref={ref}
              label="Message commun"
              multiline
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!busy}
              helper={
                current.message.trim()
                  ? "Facultatif. Videz le champ pour utiliser le message standard."
                  : applicationUpdateMessage
              }
            />
          )}
        />
        {raised && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="J’ai vérifié que la version requise est disponible sur chaque store concerné."
            accessibilityState={{ checked, disabled: busy }}
            disabled={busy}
            onPress={() => setAcknowledged(checked ? undefined : storeChoice)}
            style={styles.acknowledgement}
          >
            <View
              style={[
                styles.check,
                {
                  borderColor: colors.border,
                  backgroundColor: checked ? colors.text : colors.surface,
                },
              ]}
            >
              {checked && (
                <Check
                  accessible={false}
                  size={tokens.size.controlIcon}
                  color={colors.canvas}
                />
              )}
            </View>
            <Text style={[styles.acknowledgementText, { color: colors.text }]}>
              J’ai vérifié que la version requise est disponible sur chaque
              store concerné.
            </Text>
          </Pressable>
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
          variant="secondary"
          label="Aperçu"
          onPress={() => setPreview(true)}
          disabled={busy}
        />
        <Button
          fullWidth
          label="Appliquer les modifications"
          disabled={busy || rereadRequired || !isDirty || (raised && !checked)}
          loading={isSubmitting || editing.content.isPending}
          onPress={() =>
            void handleSubmit(confirm, (errors) =>
              setExpanded({
                ios: !!errors.ios || expanded.ios,
                android: !!errors.android || expanded.android,
              }),
            )()
          }
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
      <Modal
        visible={preview}
        animationType="slide"
        onRequestClose={() => setPreview(false)}
      >
        <ApplicationVersionsPreview
          message={current.message.trim() || null}
          onClose={() => setPreview(false)}
        />
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.spacing.lg },
  card: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
    borderRadius: tokens.radius.sheet,
    borderWidth: tokens.borderWidth,
  },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    minHeight: tokens.touchTarget.android,
  },
  platform: { ...tokens.typography.strong, flex: 1 },
  minimum: { ...tokens.typography.metadata, flexShrink: 1 },
  hidden: { display: "none" },
  acknowledgement: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    minHeight: tokens.touchTarget.android,
  },
  acknowledgementText: { ...tokens.typography.body, flex: 1 },
  check: {
    width: tokens.size.controlIcon,
    height: tokens.size.controlIcon,
    borderRadius: tokens.radius.badge,
    borderWidth: tokens.borderWidth,
  },
});
