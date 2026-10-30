import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  CollectionControlResponse,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { Surface } from "../../../shared/components/surface";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import type { useCollectionControl } from "../api/use-collection-controls";
import { formatCollectionTimestamp } from "../model/collection-time";

/** A selected control displays its native mutation state and the applicable season facts. */
export interface CollectionControlProps {
  control: CollectionControlResponse;
  editing: ReturnType<typeof useCollectionControl>;
  season?: CollectionSeasonResponse;
  seasonFetching?: boolean;
  stateUnavailable?: boolean;
}
/** Presents desired activity, execution observations and ordinary mutation feedback. */
export function CollectionControl({
  control,
  editing,
  season,
  seasonFetching = false,
  stateUnavailable = false,
}: CollectionControlProps) {
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const confirmAction = useActionConfirmation();
  const { authority } = editing;
  const mounted = useRef(false);
  const reading = editing.query.isFetching || seasonFetching;
  const closed = season?.state === "closed";
  const busy =
    !authority.enabled ||
    editing.activity.isPending ||
    editing.request.isPending ||
    reading;
  const running = control.cycle?.state === "running";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  /** Sends the confirmed desired state and revision; native mutation callbacks own invalidation. */
  async function send(command: "activity" | "request") {
    if (
      !mounted.current ||
      busy ||
      closed ||
      stateUnavailable ||
      editing.query.isError ||
      (command === "request" && !control.enabled)
    )
      return;
    try {
      const attempt =
        command === "activity"
          ? editing.activity.mutateAsync({
              revision: control.revision,
              enabled: !control.enabled,
            })
          : editing.request.mutateAsync({ revision: control.revision });
      actionFeedback.clear();
      await attempt;
    } catch {
      actionFeedback.error();
    }
  }
  /** Native confirmation belongs to the mounted control; the backend rechecks current permission and revision. */
  async function confirm(command: "activity" | "request") {
    if (busy || closed || stateUnavailable || editing.query.isError) return;
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
    if (
      !(await confirmAction({
        title: `${label} ?`,
        message: detail,
        confirmLabel: label,
      }))
    )
      return;
    await send(command);
  }
  return (
    <Surface>
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
              disabled={busy || stateUnavailable || editing.query.isError}
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
          ? formatCollectionTimestamp(control.lastAttemptAt)
          : "jamais"}
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        Dernier succès complet :{" "}
        {control.lastSuccessAt
          ? formatCollectionTimestamp(control.lastSuccessAt)
          : "aucun"}
      </Text>
    </Surface>
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
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.sm,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.compact,
  },
  action: { flex: 1, minWidth: 110 },
});
