import { useRouter } from "expo-router";
import { ChevronRight, Globe, Trophy } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type {
  CollectionProviderEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  requiresPreparationReread,
  useSeasonPreparation,
} from "../api/use-source-preparation";
import {
  CollectionAccessFeedback,
  EmptySources,
  PreparationCard,
  PreparationPage,
  SeasonIdentity,
  SourceBadge,
  preparationStyles,
} from "../components/preparation-layout";
import {
  CreateSourceForm,
  type CreateSourceValues,
} from "../forms/create-source-form";

/** Provider preparation keeps manual candidate drafts local; the route owns navigation discard. */
export interface ProviderSourcesScreenProps {
  seasonId: string;
  provider: CollectionProviderEnum;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Lists missing/discovered source coverage and launches only explicitly selected qualified bindings. */
export function ProviderSourcesScreen({
  seasonId,
  provider,
  onDirtyChange,
}: ProviderSourcesScreenProps) {
  const editing = useSeasonPreparation(seasonId);
  const { authority, season, sources } = editing;
  const current =
    authority.sessionStatus === "authenticated" ? season.data : undefined;
  return (
    <PreparationPage title={provider === "lnv" ? "LNV" : "FFVB"}>
      <CollectionAccessFeedback authority={authority} />
      {current && sources.data ? (
        <ProviderPreparation
          key={`${authority.session.generation}:${seasonId}:${provider}`}
          season={current}
          provider={provider}
          editing={editing}
          onDirtyChange={onDirtyChange}
        />
      ) : (
        authority.enabled &&
        (season.isError || sources.isError ? (
          <RequestError
            message="Les sources sont indisponibles."
            onRetry={() => {
              void season.refetch();
              void sources.refetch();
            }}
            retrying={season.isFetching || sources.isFetching}
          />
        ) : (
          <RequestLoading />
        ))
      )}
    </PreparationPage>
  );
}

/** A season-revision snapshot protects the explicit selection and the manual addition form through reconciliation. */
function ProviderPreparation({
  season,
  provider,
  editing,
  onDirtyChange,
}: {
  season: CollectionSeasonResponse;
  provider: CollectionProviderEnum;
  editing: ReturnType<typeof useSeasonPreparation>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { authority } = editing;
  const { session } = authority;
  const router = useRouter();
  const { colors } = useTheme();
  const [baseline, setBaseline] = useState(season);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [needsRead, setNeedsRead] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const sources =
    editing.sources.data?.items.filter(
      (source) => source.provider === provider,
    ) ?? [];
  const closed = season.state === "closed";
  const busy =
    !authority.enabled ||
    editing.create.isPending ||
    editing.launch.isPending ||
    editing.season.isFetching ||
    editing.sources.isFetching;
  const rereadRequired = needsRead || season.revision > baseline.revision;
  const ready = sources
    .filter(
      (source) =>
        source.validation === "qualified" &&
        !source.launched &&
        (source.locked ? source.acceptedUrl : source.candidateUrl),
    )
    .map((source) => source.id);
  const selection = selected ?? ready;
  const canLaunch =
    !closed &&
    selection.length > 0 &&
    selection.every((id) =>
      sources.some(
        (source) =>
          source.id === id &&
          source.validation === "qualified" &&
          !source.launched &&
          (source.locked ? source.acceptedUrl : source.candidateUrl),
      ),
    );
  const Icon = provider === "lnv" ? Trophy : Globe;

  /** Leaves selection and manual values intact; only uncertain/conflicting commands require reconciliation. */
  function failed(error: unknown) {
    if (!session.isCurrent(session.generation)) return;
    if (requiresPreparationReread(error)) {
      setNeedsRead(true);
      setFeedback("Le résultat doit être vérifié avant une nouvelle action.");
    } else setFeedback("L’action a été refusée. Votre saisie est conservée.");
  }
  /** Adds a candidate for this explicit provider/season; success never implies qualification or periodic launch. */
  async function create(values: CreateSourceValues) {
    if (busy || closed || rereadRequired) return false;
    try {
      await editing.create.mutateAsync({
        seasonRevision: baseline.revision,
        provider,
        ...values,
      });
      if (!session.isCurrent(session.generation)) return false;
      setAdding(false);
      setNeedsRead(true);
      setFeedback("Source ajoutée. Relisez l’état avant une nouvelle action.");
      return true;
    } catch (error) {
      failed(error);
      return false;
    }
  }
  /** Presents the actual selected labels; a native confirmation never broadens the atomic launch scope. */
  function confirmLaunch() {
    if (busy || rereadRequired || !canLaunch) return;
    setSelected(selection);
    Alert.alert(
      "Lancer les sources prêtes ?",
      `${sources
        .filter((source) => selection.includes(source.id))
        .map((source) => source.label)
        .join(
          ", ",
        )}\nLes liens sélectionnés seront verrouillés. Ce lancement ne garantit pas que toutes les sources ont publié une saison complète.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Lancer", onPress: () => void launch(selection) },
      ],
    );
  }
  /** Sends exactly the selection against its read revision and clears it only after confirmed acceptance. */
  async function launch(confirmed: string[]) {
    if (
      !session.isCurrent(session.generation) ||
      busy ||
      rereadRequired ||
      !canLaunch
    )
      return;
    try {
      const accepted = await editing.launch.mutateAsync({
        revision: baseline.revision,
        sourceBindingIds: confirmed,
      });
      if (!session.isCurrent(session.generation)) return;
      setBaseline(accepted);
      setSelected(null);
      setFeedback("Sources sélectionnées lancées.");
    } catch (error) {
      failed(error);
    }
  }
  /** Reads the entire launch context; a failed half-read cannot unlock an old selection or replay its command. */
  async function reread() {
    const [seasonResult, sourcesResult] = await Promise.all([
      editing.season.refetch(),
      editing.sources.refetch(),
    ]);
    if (!session.isCurrent(session.generation)) return;
    if (
      seasonResult.isError ||
      sourcesResult.isError ||
      !seasonResult.data ||
      !sourcesResult.data ||
      seasonResult.data.revision < baseline.revision
    ) {
      setNeedsRead(true);
      setFeedback("La relecture a échoué. Votre saisie est conservée.");
      return;
    }
    setBaseline(seasonResult.data);
    setNeedsRead(false);
    setFeedback("État relu. Vérifiez votre saisie avant une nouvelle action.");
  }
  return (
    <View style={preparationStyles.form}>
      <SeasonIdentity season={season} />
      {closed && (
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Saison clôturée
        </Text>
      )}
      {sources.length === 0 && (
        <EmptySources
          label={
            provider === "lnv"
              ? "Aucun championnat découvert"
              : "Aucune source découverte"
          }
        />
      )}
      {sources.map((source) => (
        <PreparationCard key={source.id}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Préparer ${source.label}`}
            onPress={() =>
              router.push({
                pathname: "/collection/[seasonId]/sources/[sourceId]",
                params: { seasonId: season.id, sourceId: source.id },
              })
            }
            style={styles.source}
          >
            <Icon
              accessible={false}
              color={colors.icon}
              size={tokens.size.actionIcon}
            />
            <View style={styles.identity}>
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                {source.label}
              </Text>
              <SourceBadge source={source} />
            </View>
            <ChevronRight
              accessible={false}
              color={colors.icon}
              size={tokens.size.controlIcon}
            />
          </Pressable>
        </PreparationCard>
      ))}
      {!closed && (
        <>
          <Button
            label="Lancer les sources prêtes"
            fullWidth
            onPress={confirmLaunch}
            disabled={busy || rereadRequired || !canLaunch}
            loading={editing.launch.isPending}
          />
          {selected !== null && !canLaunch && (
            <Button
              label="Revenir aux sources prêtes"
              variant="secondary"
              onPress={() => setSelected(null)}
              disabled={busy}
            />
          )}
          {!adding && (
            <Button
              label="Ajouter une source"
              variant="secondary"
              onPress={() => setAdding(true)}
              disabled={busy}
            />
          )}
        </>
      )}
      {adding && (
        <PreparationCard>
          <CreateSourceForm
            disabled={busy || closed || rereadRequired}
            saving={editing.create.isPending}
            onSubmit={create}
            onDirtyChange={onDirtyChange}
          />
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
      {(editing.season.isError || editing.sources.isError) && !feedback && (
        <RequestError message="La relecture a échoué. Votre saisie est conservée." />
      )}
      <Button
        label="Relire l’état"
        variant="secondary"
        onPress={() => void reread()}
        disabled={busy}
        loading={editing.season.isFetching || editing.sources.isFetching}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
    minHeight: tokens.size.control,
  },
  identity: { flex: 1, gap: tokens.spacing.xs },
});
