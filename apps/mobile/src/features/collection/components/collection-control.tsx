import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  CollectionControlResponse,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { Surface } from "@/shared/components/surface";
import { useActionConfirmation } from "@/shared/forms/use-action-confirmation";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import type { useCollectionControl } from "../api/use-collection-controls";
import { formatCollectionTimestamp } from "../model/collection-time";
import { isCollectionReadRefused } from "../api/collection-queries";

/** A selected control displays its native mutation state and the applicable season facts. */
export interface CollectionControlProps {
  control: CollectionControlResponse;
  editing: ReturnType<typeof useCollectionControl>;
  season?: CollectionSeasonResponse;
}

/** Presents desired activity, execution observations and ordinary mutation feedback. */
export function CollectionControl({
  control,
  editing,
  season,
}: Readonly<CollectionControlProps>) {
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const confirmAction = useActionConfirmation();
  const { authority } = editing;
  const mounted = useRef(false);
  const closed = season?.state === "closed";
  const busy =
    !authority.enabled ||
    editing.activity.isPending ||
    editing.request.isPending;
  const refused = isCollectionReadRefused(editing.query.error);
  const running = control.cycle?.state === "running";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Sends the desired state and revision; native mutation callbacks own invalidation. */
  async function send(command: "activity" | "request") {
    if (
      !mounted.current ||
      busy ||
      closed ||
      refused ||
      (command === "request" && !control.enabled)
    ) {
      return;
    }
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
  async function confirmRequest() {
    if (busy || closed || refused) {
      return;
    }

    if (
      !(await confirmAction({
        title: "Relancer ?",
        message:
          "Demander une collecte de ce périmètre. L’acceptation ne garantit ni son démarrage ni son achèvement.",
        confirmLabel: "Relancer",
      }))
    ) {
      return;
    }
    await send("request");
  }

  /** Distinguishes execution observations from requested control activity. */
  function cycleLabel() {
    if (running) {
      return "Collecte en cours";
    }
    if (control.cycle?.state === "interrupted") {
      return "Collecte interrompue · résultat à vérifier";
    }
    if (control.cycle?.state === "completed") {
      return "Dernier cycle terminé";
    }
    return "Aucune exécution confirmée";
  }

  /** Prioritizes pending intent over the observed running cycle. */
  function requestLabel() {
    if (control.pendingRequestId) {
      return "Demandée";
    }
    if (running) {
      return "En cours";
    }
    return "Relancer";
  }

  /** Prioritizes closure over requested and observed activity. */
  function controlStatus() {
    if (closed) {
      return "Clôturée";
    }
    if (control.enabled) {
      return "Active";
    }
    if (running) {
      return "Mise en pause en cours";
    }
    return "En pause";
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
          {controlStatus()}
        </Text>
      </View>
      {!closed && (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              fullWidth
              variant="secondary"
              label={control.enabled ? "Mettre en pause" : "Reprendre"}
              disabled={busy || refused}
              loading={editing.activity.isPending}
              onPress={() => send("activity")}
            />
          </View>
          <View style={styles.action}>
            <Button
              fullWidth
              label={requestLabel()}
              disabled={
                busy ||
                refused ||
                !control.enabled ||
                !!control.pendingRequestId ||
                running
              }
              loading={editing.request.isPending}
              onPress={confirmRequest}
            />
          </View>
        </View>
      )}
      {control.pendingRequestId && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          En attente de démarrage
        </Text>
      )}
      <Text style={[tokens.typography.strong, { color: colors.text }]}>
        {cycleLabel()}
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
  action: {
    flexBasis: "auto",
    flexGrow: 1,
    minWidth: 110,
    maxWidth: "100%",
  },
});
