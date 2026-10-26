import { isAccessDenied } from "../../../shared/api/access-denied";
import {
  ActionFeedbackProvider,
  useActionFeedback,
} from "../../../shared/components/action-feedback";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { applicationVersionsValues } from "./application-versions-values";
import { toApplicationVersionsRequest } from "../api/application-versions-request";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { applicationVersionsEditor } from "./application-versions-editor";
import { applicationUpdateMessage } from "../application-update-message";
import { ChevronDown, ChevronRight, Check } from "lucide-react-native";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Controller, useForm, useFormState, useWatch } from "react-hook-form";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { ApplicationVersionsResponse } from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { TextField } from "../../../shared/components/text-field";
import { Surface } from "../../../shared/components/surface";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useAccountSession } from "../../accounts/current-account";
import { useApplicationVersionsSettings } from "../api/use-application-versions-settings";
import {
  applicationVersionsSchema,
  raisesMinimum,
  type ApplicationVersionsValues,
} from "../schemas/application-versions-schema";
import { ApplicationVersionsPreview } from "../screens/access-gate-screen";

/** Keeps one editable group revision and a local draft; only explicit reread reconciles newer server data. */
export interface ApplicationVersionsFormProps {
  settings: ApplicationVersionsResponse;
  editing: ReturnType<typeof useApplicationVersionsSettings>;
  disabled?: boolean;
}

/** Publishes atomic dirty-field changes without changing maintenance or replaying uncertain writes. */
export function ApplicationVersionsForm({
  settings,
  editing,
  disabled = false,
}: ApplicationVersionsFormProps) {
  const session = useAccountSession();
  const { colors } = useTheme();
  const confirmAction = useActionConfirmation();
  const actionFeedback = useActionFeedback();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > 1;
  const mounted = useRef(false);
  const [editor] = useState(() => applicationVersionsEditor(session, settings));
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline } = state;
  const feedback = editing.content.needsRead
    ? "Le résultat doit être vérifié. Relisez les réglages avant une nouvelle soumission."
    : Math.max(settings.revision, editing.observedRevision) > baseline.revision
      ? "Les réglages ont changé. Relisez-les avant une nouvelle soumission."
      : state.feedback;
  const [expanded, setExpanded] = useState({ ios: false, android: false });
  const [preview, setPreview] = useState(false);
  const [acknowledged, setAcknowledged] = useState<string>();
  const { control, handleSubmit, reset } = useForm<ApplicationVersionsValues>({
    formControl: editor.form.formControl,
    resolver: zodResolver(applicationVersionsSchema),
  });
  const { isDirty, dirtyFields } = useFormState({
    control,
  });
  useDiscardChanges(isDirty, () => {
    editor.discard();
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
  const busy = disabled || editing.content.pending || editing.query.isFetching;
  const rereadRequired =
    editing.content.needsRead ||
    Math.max(settings.revision, editing.observedRevision) > baseline.revision;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Maps only dirty fields, with null removals, into the generated atomic PATCH. */
  async function submit(draft: ApplicationVersionsValues) {
    if (
      !session.isCurrent(session.generation) ||
      busy ||
      rereadRequired ||
      (raised && !checked)
    )
      return;
    if (
      !(await confirmAction({
        title: "Appliquer les modifications ?",
        message: "Les réglages de maintenance restent inchangés.",
        confirmLabel: "Appliquer",
      })) ||
      !session.isCurrent(session.generation)
    )
      return;
    actionFeedback.clear();
    try {
      const command = editing.content.start(
        toApplicationVersionsRequest(baseline.revision, draft, dirtyFields),
      );
      if (!command) return;
      const accepted = await command;
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        baseline: accepted,
      });
      reset(applicationVersionsValues(accepted));
      if (mounted.current) setAcknowledged(undefined);
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      if (!requiresRevisionRead(error))
        actionFeedback.error(
          "L’enregistrement a été refusé. Vérifiez les valeurs et vos permissions.",
        );
    }
  }
  /** Reads the actual outcome and keeps dirty fields, without submitting or merging conflicting input. */
  async function reread() {
    actionFeedback.clear();
    const { result, reconciled } = await editing.content.reconcile(
      [editing.queryKey],
      () => editing.query.refetch(),
      (result) =>
        !result.isError &&
        !!result.data &&
        result.data.revision >= baseline.revision,
    );
    // Query may restore its old success when route removal cancels this read.
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (
      !reconciled ||
      !result.data ||
      result.isError ||
      result.data.revision < baseline.revision
    ) {
      if (!isAccessDenied(result.error))
        actionFeedback.error(
          "La relecture a échoué. Votre brouillon est conservé.",
        );
      return;
    }
    editor.update({
      baseline: result.data,
      feedback:
        "Réglages relus. Vérifiez votre brouillon avant de le soumettre à nouveau.",
    });
    reset(applicationVersionsValues(result.data), {
      keepDirtyValues: true,
      keepDirty: true,
    });
    setAcknowledged(undefined);
  }
  return (
    <View style={styles.form}>
      <View style={styles.platforms}>
        {(["ios", "android"] as const).map((platform) => {
          const ios = platform === "ios";
          const name = ios ? "iOS" : "Android";
          const open = expanded[platform];
          const Chevron = open ? ChevronDown : ChevronRight;
          return (
            <View
              key={platform}
              style={[
                styles.platformCard,
                (largeText || expanded.ios || expanded.android) &&
                  styles.expandedCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={name}
                accessibilityState={{ expanded: open }}
                onPress={() => setExpanded({ ...expanded, [platform]: !open })}
                style={({ pressed }) => [
                  styles.disclosure,
                  { opacity: pressed ? tokens.opacity.pressed : 1 },
                ]}
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
                style={[styles.fields, !open && styles.hidden]}
                accessibilityElementsHidden={!open}
                importantForAccessibility={
                  open ? "auto" : "no-hide-descendants"
                }
              >
                <View style={styles.form}>
                  <Controller
                    control={control}
                    name={`${platform}.minimumVersion`}
                    render={({ field, fieldState }) => (
                      <TextField
                        ref={field.ref}
                        label={`Version minimale ${name}`}
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!busy}
                        error={fieldState.error?.message}
                        helper="Facultatif. Trois nombres, par exemple 2.10.0. Videz le champ pour retirer le minimum."
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`${platform}.storeUrl`}
                    render={({ field, fieldState }) => (
                      <TextField
                        ref={field.ref}
                        label={
                          ios ? "URL App Store iOS" : "URL Google Play Android"
                        }
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        autoCapitalize="none"
                        autoCorrect={false}
                        inputMode="url"
                        editable={!busy}
                        error={fieldState.error?.message}
                        helper="Lien requis si une version minimale est imposée."
                      />
                    )}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <Surface>
        <View style={styles.form}>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.heading, { color: colors.text }]}
          >
            Contenu affiché
          </Text>
          <Controller
            control={control}
            name="message"
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label="Message commun"
                multiline
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!busy}
                error={fieldState.error?.message}
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
              style={({ pressed }) => [
                styles.acknowledgement,
                {
                  opacity: busy
                    ? tokens.opacity.disabled
                    : pressed
                      ? tokens.opacity.pressed
                      : 1,
                },
              ]}
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
              <Text
                style={[styles.acknowledgementText, { color: colors.text }]}
              >
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
          <View style={styles.actions}>
            <View style={[styles.action, largeText && styles.expandedCard]}>
              <Button
                fullWidth
                variant="secondary"
                label="Aperçu"
                onPress={() => {
                  actionFeedback.clear();
                  setPreview(true);
                }}
                disabled={busy}
              />
            </View>
            <View style={[styles.action, largeText && styles.expandedCard]}>
              <Button
                fullWidth
                label="Enregistrer"
                disabled={
                  busy || rereadRequired || !isDirty || (raised && !checked)
                }
                loading={editing.content.executing}
                onPress={() =>
                  void handleSubmit(submit, (errors) =>
                    setExpanded({
                      ios: !!errors.ios || expanded.ios,
                      android: !!errors.android || expanded.android,
                    }),
                  )()
                }
              />
            </View>
          </View>
        </View>
      </Surface>
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
        <SafeAreaProvider>
          {/* Native modal surfaces own their overlay; iOS retains children through dismissal, so closing resets callbacks immediately. */}
          <ActionFeedbackProvider
            key={preview ? "open" : "closed"}
            scopeKey={session.generation}
          >
            <ApplicationVersionsPreview
              message={current.message.trim() || null}
              storeUrl={
                applicationVersionsSchema.safeParse(current).success
                  ? current[Platform.OS === "ios" ? "ios" : "android"]
                      .storeUrl || null
                  : null
              }
              onClose={() => setPreview(false)}
            />
          </ActionFeedbackProvider>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.spacing.lg },
  platforms: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  platformCard: {
    flexBasis: 160,
    flexGrow: 1,
    borderRadius: tokens.radius.sheet,
    borderWidth: tokens.borderWidth,
  },
  expandedCard: { flexBasis: "100%" },
  fields: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  action: { flexBasis: 128, flexGrow: 1 },
  disclosure: {
    padding: tokens.spacing.lg,
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
