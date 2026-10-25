import { useActionFeedback } from "../../../shared/components/action-feedback";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Controller, useForm, useFormState, useWatch } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { TextField } from "../../../shared/components/text-field";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useCloseCollectionSeason } from "../api/use-collection-controls";
import {
  CollectionAccessFeedback,
  PreparationCard,
  PreparationPage,
  SeasonIdentity,
  preparationStyles,
} from "../components/preparation-layout";
import {
  closeSeasonEditor,
  discardCloseSeasonEditor,
  type CloseSeasonValues,
} from "../forms/close-season-editor";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";

const closureSchema = z.object({ confirmation: z.string() });

/** An ordinary route retains the exact typed season label through refusals and temporary admission removal. */
export function CloseSeasonScreen({ seasonId }: { seasonId: string }) {
  const editing = useCloseCollectionSeason(seasonId);
  const { authority, season } = editing;
  return (
    <PreparationPage title="Clôturer la saison">
      <CollectionAccessFeedback authority={authority} />
      {season.data ? (
        <ClosureForm
          key={`${authority.session.generation}/${seasonId}`}
          season={season.data}
          editing={editing}
        />
      ) : (
        authority.enabled &&
        (season.isError ? (
          <RequestError
            message="La saison est indisponible."
            onRetry={() => void season.refetch()}
            retrying={season.isFetching}
          />
        ) : (
          <RequestLoading />
        ))
      )}
    </PreparationPage>
  );
}

/** A closure decision owns its original revision; background results cannot replace the user's typed confirmation. */
function ClosureForm({
  season,
  editing,
}: {
  season: CollectionSeasonResponse;
  editing: ReturnType<typeof useCloseCollectionSeason>;
}) {
  const { authority } = editing;
  const { session } = authority;
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const router = useRouter();
  const mounted = useRef(false);
  const [editor] = useState(() => closeSeasonEditor(session, season));
  const baseline = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const [notice, setNotice] = useState<string>();
  const feedback =
    notice ??
    (editing.close.needsRead
      ? "Le résultat doit être vérifié avant une nouvelle action."
      : editing.seasonInvalidated
        ? "L’état de la saison doit être relu avant une nouvelle action."
        : undefined);
  const { control, handleSubmit, reset } = useForm<CloseSeasonValues>({
    resolver: zodResolver(closureSchema),
    formControl: editor.form.formControl,
  });
  const { isDirty } = useFormState({ control });
  const confirmation = useWatch({ control, name: "confirmation" });
  const current = editing.season.data ?? season;
  const closed = current.state === "closed";
  const busy =
    !authority.enabled || editing.close.pending || editing.season.isFetching;
  const needsRead =
    editing.close.needsRead ||
    editing.seasonInvalidated ||
    current.revision !== baseline.revision;
  useDiscardChanges(isDirty && !closed, () => {
    reset({ confirmation: "" });
    discardCloseSeasonEditor();
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Exact equality and the original revision are checked before sending; the backend atomically rechecks both. */
  async function close(values: CloseSeasonValues) {
    if (
      busy ||
      closed ||
      needsRead ||
      editing.season.isError ||
      values.confirmation !== current.label ||
      values.confirmation !== baseline.label
    )
      return;
    setNotice(undefined);
    try {
      const attempt = editing.close.start({
        revision: baseline.revision,
        confirmation: values.confirmation,
      });
      if (!attempt) return;
      actionFeedback.clear();
      const accepted = await attempt;
      if (!session.isCurrent(session.generation)) return;
      editor.update(accepted);
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      if (requiresRevisionRead(error))
        setNotice("Le résultat doit être vérifié avant une nouvelle action.");
      else
        actionFeedback.error(
          "La clôture a été refusée. Votre saisie est conservée.",
        );
    }
  }

  /** Reads the actual lifecycle before any explicit retry; entered text stays RHF-owned and unchanged. */
  async function reread() {
    if (busy) return;
    const { result: read, reconciled } = await editing.close.reconcile(
      [editing.seasonKey],
      () => editing.season.refetch(),
      (read) =>
        !read.isError && !!read.data && read.data.revision >= baseline.revision,
    );
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (
      !reconciled ||
      read.isError ||
      !read.data ||
      read.data.revision < baseline.revision
    ) {
      setNotice("La relecture a échoué. Votre saisie est conservée.");
      return;
    }
    editor.update(read.data);
    setNotice(
      "État relu. Vérifiez le nom de la saison avant une nouvelle action.",
    );
  }

  return (
    <View style={preparationStyles.form}>
      <SeasonIdentity season={current} />
      {closed ? (
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Saison clôturée · historique conservé
        </Text>
      ) : (
        <PreparationCard>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.heading, { color: colors.text }]}
          >
            Clôture définitive
          </Text>
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            Toutes les collectes FFVB et LNV de la saison {current.label} seront
            arrêtées. Un cycle déjà en cours pourra se terminer. L’historique
            sera conservé. Aucune réouverture ni nouvelle collecte ne sera
            possible.
          </Text>
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Les autres saisons, les fiches clubs et le géocodage restent
            inchangés.
          </Text>
          <Controller
            control={control}
            name="confirmation"
            render={({ field: { ref, value, onChange, onBlur } }) => (
              <TextField
                ref={ref}
                label="Nom exact de la saison"
                helper={`Saisissez exactement ${current.label} pour confirmer.`}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
            )}
          />
          <Button
            label="Clôturer définitivement"
            fullWidth
            disabled={
              busy ||
              needsRead ||
              editing.season.isError ||
              confirmation !== current.label ||
              confirmation !== baseline.label
            }
            loading={editing.close.executing}
            onPress={() => void handleSubmit(close)()}
          />
          {isDirty && (
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              Confirmation non envoyée
            </Text>
          )}
        </PreparationCard>
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
      {editing.season.isError && !feedback && (
        <RequestError message="La relecture a échoué. Votre saisie est conservée." />
      )}
      {!closed && (
        <Button
          label="Relire l’état"
          variant="secondary"
          disabled={busy}
          loading={editing.season.isFetching}
          onPress={() => void reread()}
        />
      )}
      <Button
        label={closed ? "Retour à la saison" : "Annuler"}
        variant="secondary"
        onPress={() => {
          if (!isDirty || closed) discardCloseSeasonEditor();
          router.back();
        }}
      />
    </View>
  );
}
