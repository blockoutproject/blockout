import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { formatCollectionTimestamp } from "../model/collection-time";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { ChevronRight, Globe } from "lucide-react-native";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type {
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { TextField } from "../../../shared/components/text-field";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  requiresPreparationReread,
  type useSourcePreparation,
} from "../api/use-source-preparation";
import {
  PreparationCard,
  SeasonIdentity,
  SourceBadge,
  preparationStyles,
} from "../components/preparation-layout";
import {
  candidateUrlSchema,
  sourceCandidateSchema,
  type SourceCandidateValues,
} from "../schemas/source-candidate";
import {
  sourcePreparationEditor,
  discardSourcePreparationEditor,
} from "./preparation-editors";

/** One source editor snapshot; failures and current-state reads preserve its dirty URL until explicit submission. */
export interface SourceCandidateFormProps {
  source: SourceBindingResponse;
  season: CollectionSeasonResponse;
  editing: ReturnType<typeof useSourcePreparation>;
}

/** Inline supported-candidate editing and explicit qualification/confirmation, without post-launch repair. */
export function SourceCandidateForm({
  source,
  season,
  editing,
}: SourceCandidateFormProps) {
  const { authority } = editing;
  const { session } = authority;
  const { colors } = useTheme();
  const router = useRouter();
  const mounted = useRef(false);
  const [editor] = useState(() => sourcePreparationEditor(session, source));
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline, editingUrl, needsRead, feedback } = state;
  const { control, handleSubmit, reset } = useForm<SourceCandidateValues>({
    resolver: zodResolver(sourceCandidateSchema),
    formControl: editor.form.formControl,
  });
  const { isDirty, isSubmitting, errors, dirtyFields } = useFormState({
    control,
  });
  useDiscardChanges(isDirty, () => {
    reset();
    discardSourcePreparationEditor();
  });
  // Subscribe to RHF's dirty fields so keepDirtyValues retains the editable snapshot on reread.
  void dirtyFields;
  const current = editing.source.data ?? source;
  const savedUrl = current.acceptedUrl ?? current.candidateUrl;
  const officialUrl =
    savedUrl && candidateUrlSchema.safeParse(savedUrl).success
      ? new URL(savedUrl)
      : undefined;
  const closed = (editing.season.data ?? season).state === "closed";
  const readOnly = closed || current.locked || current.launched;
  const busy =
    !authority.enabled ||
    editing.saving ||
    isSubmitting ||
    editing.source.isFetching ||
    editing.season.isFetching;
  const rereadRequired = needsRead || current.revision > baseline.revision;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** A refusal retains input; ambiguous acknowledgements additionally prevent any new command until reread. */
  function failed(error: unknown) {
    if (!session.isCurrent(session.generation)) return;
    if (requiresPreparationReread(error)) {
      editor.update({
        ...editor.getSnapshot(),
        needsRead: true,
        feedback: "Le résultat doit être vérifié avant une nouvelle action.",
      });
    } else
      editor.update({
        ...editor.getSnapshot(),
        feedback: "L’action a été refusée. Votre saisie est conservée.",
      });
  }
  /** Replaces only the candidate against its editing revision; a successful response invalidates old evidence. */
  async function save(values: SourceCandidateValues) {
    if (busy || readOnly || rereadRequired) return;
    try {
      const accepted = await editing.candidate.mutateAsync({
        revision: baseline.revision,
        candidateUrl: values.candidateUrl,
      });
      if (!session.isCurrent(session.generation)) return;
      reset({ candidateUrl: accepted.candidateUrl ?? "" });
      editor.update({
        baseline: accepted,
        editingUrl: false,
        needsRead: false,
        feedback:
          accepted.validation === "unvalidated"
            ? "Lien enregistré. La source doit être validée à nouveau."
            : "Lien enregistré.",
      });
    } catch (error) {
      failed(error);
    }
  }
  /** Requests validation once; 202 stays pending until an operator rereads the binding. */
  async function validate() {
    if (busy || readOnly || rereadRequired || isDirty) return;
    try {
      const accepted = await editing.validation.mutateAsync({
        revision: baseline.revision,
      });
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        ...editor.getSnapshot(),
        baseline: accepted,
        feedback: undefined,
      });
    } catch (error) {
      failed(error);
    }
  }
  /** Confirms only missing seasonal attribution, retaining the exact canonical season label. */
  function confirmSeason() {
    if (
      busy ||
      readOnly ||
      rereadRequired ||
      isDirty ||
      current.validation !== "confirmation-required"
    )
      return;
    Alert.alert(
      `Confirmer ${season.label} ?`,
      "Confirmez uniquement si cette page correspond bien à la saison préparée.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer la saison",
          onPress: () => {
            if (mounted.current) void acceptSeason();
          },
        },
      ],
    );
  }
  /** The request boundary rechecks live grants/session even when a native alert callback was held. */
  async function acceptSeason() {
    if (
      !session.isCurrent(session.generation) ||
      busy ||
      readOnly ||
      rereadRequired ||
      isDirty
    )
      return;
    try {
      const accepted = await editing.confirmation.mutateAsync({
        revision: baseline.revision,
        seasonLabel: season.label,
      });
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        ...editor.getSnapshot(),
        baseline: accepted,
        feedback: undefined,
      });
    } catch (error) {
      failed(error);
    }
  }
  /** Reads source and season together; neither a failed read nor retained cache can unlock resubmission. */
  async function reread() {
    const [sourceResult, seasonResult] = await Promise.all([
      editing.source.refetch(),
      editing.season.refetch(),
    ]);
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (
      sourceResult.isError ||
      seasonResult.isError ||
      !sourceResult.data ||
      !seasonResult.data ||
      sourceResult.data.revision < baseline.revision
    ) {
      editor.update({
        ...editor.getSnapshot(),
        needsRead: true,
        feedback: "La relecture a échoué. Votre saisie est conservée.",
      });
      return;
    }
    reset(
      { candidateUrl: sourceResult.data.candidateUrl ?? "" },
      { keepDirtyValues: true, keepDirty: true },
    );
    editor.update({
      ...editor.getSnapshot(),
      baseline: sourceResult.data,
      needsRead: false,
      feedback: "État relu. Vérifiez votre saisie avant une nouvelle action.",
    });
  }
  /** Opens only the saved candidate/accepted URL; native linking failure leaves all preparation controls usable. */
  async function openOfficialSource() {
    if (!officialUrl || !savedUrl) return;
    try {
      await Linking.openURL(savedUrl);
    } catch {
      if (session.isCurrent(session.generation))
        editor.update({
          ...editor.getSnapshot(),
          feedback: "Le lien ne peut pas être ouvert.",
        });
    }
  }
  return (
    <View style={preparationStyles.form}>
      <SeasonIdentity season={editing.season.data ?? season} />
      {closed && (
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Saison clôturée
        </Text>
      )}
      <PreparationCard>
        <View style={[preparationStyles.row, styles.heading]}>
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            Lien de découverte
          </Text>
          <SourceBadge source={current} />
        </View>
        {officialUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Ouvrir la source officielle : ${officialUrl.host}`}
            onPress={() => void openOfficialSource()}
            style={styles.sourceLink}
          >
            <Globe
              accessible={false}
              color={colors.icon}
              size={tokens.size.controlIcon}
            />
            <View style={styles.url}>
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                {officialUrl.host}
              </Text>
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                {officialUrl.pathname}
                {officialUrl.search}
              </Text>
            </View>
            <ChevronRight
              accessible={false}
              color={colors.icon}
              size={tokens.size.controlIcon}
            />
          </Pressable>
        ) : (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Aucun lien officiel renseigné.
          </Text>
        )}
        {current.seasonEvidence && (
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            Preuve de saison : {current.seasonEvidence}
          </Text>
        )}
        {current.validatedAt && (
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            Validée le {formatCollectionTimestamp(current.validatedAt)}
          </Text>
        )}
        {current.reason && (
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            {current.reason}
          </Text>
        )}
        {(!readOnly || editingUrl) && (
          <>
            {editingUrl ? (
              <>
                <Controller
                  control={control}
                  name="candidateUrl"
                  render={({ field: { ref, value, onChange, onBlur } }) => (
                    <TextField
                      ref={ref}
                      label="URL officielle"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      editable={!busy && !readOnly}
                      autoCapitalize="none"
                      autoCorrect={false}
                      inputMode="url"
                      error={errors.candidateUrl?.message}
                      helper="Formats officiels pris en charge uniquement. Modifier le lien efface sa validation précédente."
                    />
                  )}
                />
                <Button
                  label="Enregistrer le lien"
                  fullWidth
                  onPress={() => void handleSubmit(save)()}
                  disabled={busy || readOnly || rereadRequired}
                  loading={editing.saving}
                />
              </>
            ) : (
              <Button
                label="Modifier le lien"
                fullWidth
                variant="secondary"
                onPress={() => editor.update({ ...state, editingUrl: true })}
                disabled={busy}
              />
            )}
            {current.candidateUrl &&
              current.validation !== "pending" &&
              current.validation !== "qualified" &&
              current.validation !== "confirmation-required" && (
                <Button
                  label="Valider la source"
                  fullWidth
                  onPress={() => void validate()}
                  disabled={busy || rereadRequired || isDirty}
                  loading={editing.validation.isPending}
                />
              )}
            {current.validation === "confirmation-required" && (
              <Button
                label="Confirmer la saison"
                fullWidth
                onPress={confirmSeason}
                disabled={busy || rereadRequired || isDirty}
                loading={editing.confirmation.isPending}
              />
            )}
          </>
        )}
      </PreparationCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          current.provider === "lnv"
            ? "Phases découvertes"
            : "Groupes découverts"
        }
        accessibilityState={{ disabled: !authority.enabled }}
        style={styles.sourceLink}
        disabled={!authority.enabled}
        onPress={() =>
          router.push({
            pathname: "/collection/[seasonId]/sources/[sourceId]/children",
            params: { seasonId: season.id, sourceId: current.id },
          })
        }
      >
        <Text
          style={[
            tokens.typography.navigation,
            styles.url,
            { color: colors.text },
          ]}
        >
          {current.provider === "lnv"
            ? "Phases découvertes"
            : "Groupes découverts"}
        </Text>
        <ChevronRight
          accessible={false}
          size={tokens.size.controlIcon}
          color={colors.icon}
        />
      </Pressable>
      {isDirty && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Modifications non enregistrées
        </Text>
      )}
      {feedback && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {feedback}
        </Text>
      )}
      {(editing.source.isError || editing.season.isError) && !feedback && (
        <RequestError message="La relecture a échoué. Votre saisie est conservée." />
      )}
      <Button
        label="Relire l’état"
        variant="secondary"
        onPress={() => void reread()}
        disabled={busy}
        loading={editing.source.isFetching || editing.season.isFetching}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  heading: { justifyContent: "space-between" },
  sourceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.compact,
    minHeight: tokens.size.control,
  },
  url: { flex: 1, gap: tokens.spacing.xs },
});
