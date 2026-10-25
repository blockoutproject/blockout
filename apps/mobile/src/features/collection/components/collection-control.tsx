import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type {
  CollectionControlResponse,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import type { useCollectionControl } from "../api/use-collection-controls";
import { requiresPreparationReread as requiresCollectionReread } from "../api/use-source-preparation";
import { collectionCommandContext } from "../forms/collection-command-context";
import { PreparationCard } from "./preparation-layout";

/** A selected control retains its own command boundary; season rereads are required only for competition controls. */
export interface CollectionControlProps {
  control: CollectionControlResponse;
  editing: ReturnType<typeof useCollectionControl>;
  season?: CollectionSeasonResponse;
  rereadSeason?: () => Promise<boolean>;
  stateUnavailable?: boolean;
}

/** Separates desired activity, confirmed execution and observations; uncertain commands require an explicit read. */
export function CollectionControl({
  control,
  editing,
  season,
  rereadSeason,
  stateUnavailable = false,
}: CollectionControlProps) {
  const { colors } = useTheme();
  const { authority } = editing;
  const { session } = authority;
  const [context] = useState(() =>
    collectionCommandContext(session, control.id),
  );
  const { needsRead, feedback } = useSyncExternalStore(
    context.subscribe,
    context.getSnapshot,
  );
  const mounted = useRef(false);
  const [reading, setReading] = useState(false);
  const closed = season?.state === "closed";
  const busy =
    !authority.enabled || editing.saving || editing.query.isFetching || reading;
  const running = control.cycle?.state === "running";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Sends the exact confirmed revision once; even route removal preserves reconciliation until its outcome is known. */
  async function send(command: "activity" | "request") {
    if (
      !mounted.current ||
      busy ||
      closed ||
      context.getSnapshot().needsRead ||
      stateUnavailable ||
      editing.query.isError ||
      !session.isCurrent(session.generation) ||
      (command === "request" && !control.enabled)
    )
      return;
    context.update({ needsRead: true });
    try {
      if (command === "activity")
        await editing.activity.mutateAsync({
          revision: control.revision,
          enabled: !control.enabled,
        });
      else {
        await editing.request.mutateAsync({ revision: control.revision });
      }
      if (session.isCurrent(session.generation))
        context.update({ needsRead: false });
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      context.update({
        needsRead: requiresCollectionReread(error),
        feedback: requiresCollectionReread(error)
          ? "Le résultat doit être vérifié avant une nouvelle action."
          : "L’action a été refusée. Le périmètre est conservé.",
      });
    }
  }

  /** Native confirmations describe pause/drain or normal eligibility; acceptance still rechecks current F05/F12 authority. */
  function confirm(command: "activity" | "request") {
    if (
      busy ||
      closed ||
      needsRead ||
      stateUnavailable ||
      editing.query.isError
    )
      return;
    const label =
      command === "request"
        ? "Relancer"
        : control.enabled
          ? "Mettre en pause"
          : "Reprendre";
    const detail =
      command === "request"
        ? "Demander une collecte de ce périmètre. L’acceptation ne garantit ni son démarrage ni son achèvement."
        : control.enabled
          ? "La demande en attente sera annulée. Une collecte déjà en cours pourra se terminer."
          : "La collecte reprendra aux prochaines échéances éligibles, sans rejouer les passages manqués.";
    Alert.alert(`${label} ?`, detail, [
      { text: "Annuler", style: "cancel" },
      {
        text: label,
        onPress: () => {
          void send(command);
        },
      },
    ]);
  }

  /** Only an explicit successful control/season read releases uncertainty; cache refresh alone never does. */
  async function reread() {
    if (busy) return;
    setReading(true);
    const [current, seasonRead] = await Promise.all([
      editing.query.refetch(),
      rereadSeason?.() ?? true,
    ]);
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    setReading(false);
    if (current.isError || !current.data || !seasonRead) {
      context.update({
        needsRead: true,
        feedback: "La relecture a échoué. Le périmètre est conservé.",
      });
      return;
    }
    context.update({
      needsRead: false,
      feedback: "État relu. Vérifiez le périmètre avant une nouvelle action.",
    });
  }

  return (
    <PreparationCard>
      <View style={styles.heading}>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Collecte
        </Text>
        <Text
          style={[
            styles.badge,
            {
              color: control.enabled
                ? colors.onSuccessSubtle
                : colors.secondaryText,
              backgroundColor: control.enabled
                ? colors.successSubtle
                : colors.raised,
            },
          ]}
        >
          {closed
            ? "Clôturée"
            : control.enabled
              ? "Active"
              : running
                ? "Mise en pause en cours"
                : "En pause"}
        </Text>
      </View>
      {!closed && (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              fullWidth
              variant="secondary"
              label={control.enabled ? "Mettre en pause" : "Reprendre"}
              disabled={
                busy || needsRead || stateUnavailable || editing.query.isError
              }
              loading={editing.activity.isPending}
              onPress={() => confirm("activity")}
            />
          </View>
          <View style={styles.action}>
            <Button
              fullWidth
              label={
                control.pendingRequestId
                  ? "Demandée"
                  : running
                    ? "En cours"
                    : "Relancer"
              }
              disabled={
                busy ||
                needsRead ||
                stateUnavailable ||
                editing.query.isError ||
                !control.enabled ||
                !!control.pendingRequestId ||
                running
              }
              loading={editing.request.isPending}
              onPress={() => confirm("request")}
            />
          </View>
        </View>
      )}
      {control.pendingRequestId && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Collecte demandée · en attente de démarrage
        </Text>
      )}
      <Text style={[tokens.typography.strong, { color: colors.text }]}>
        {running
          ? "Collecte en cours"
          : control.cycle?.state === "interrupted"
            ? "Collecte interrompue · résultat à vérifier"
            : control.cycle?.state === "completed"
              ? "Dernier cycle terminé"
              : "Aucune exécution confirmée"}
      </Text>
      {running && !control.enabled && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Le cycle en cours se termine. Aucun nouveau cycle ne démarrera.
        </Text>
      )}
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        Dernière tentative :{" "}
        {control.lastAttemptAt
          ? new Date(control.lastAttemptAt).toLocaleString("fr-FR")
          : "jamais"}
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        Dernier succès complet :{" "}
        {control.lastSuccessAt
          ? new Date(control.lastSuccessAt).toLocaleString("fr-FR")
          : "aucun"}
      </Text>
      {feedback && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {feedback}
        </Text>
      )}
      {needsRead && (
        <Button
          label="Relire l’état"
          variant="secondary"
          disabled={busy}
          loading={reading}
          onPress={() => void reread()}
        />
      )}
    </PreparationCard>
  );
}
const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  badge: {
    ...tokens.typography.metadata,
    borderRadius: tokens.radius.badge,
    padding: tokens.spacing.sm,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.compact,
  },
  action: { flex: 1, minWidth: 110 },
});
