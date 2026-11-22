import { useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  CollectionControlResponse,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { Skeleton } from "@/shared/components/skeleton";
import { Surface } from "@/shared/components/surface";
import { TextSkeleton } from "@/shared/components/text-skeleton";
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
  /** Retained provider tabs clear confirmation when the operator leaves Suivi. */
  active?: boolean;
}

/** Presents desired activity, execution observations and ordinary mutation feedback. */
export function CollectionControl({
  control,
  editing,
  season,
  active = true,
}: Readonly<CollectionControlProps>) {
  const { colors } = useTheme();
  const { clear, error, success } = useActionFeedback();
  const navigation = useNavigation();
  const confirmAction = useActionConfirmation();
  const { authority } = editing;
  const activeVisit = useRef(false);
  const closed = season?.state === "closed";
  const running = control.cycle?.state === "running";
  const canChangeActivity =
    authority.enabled &&
    !closed &&
    !editing.activity.isPending &&
    !editing.request.isPending &&
    !isCollectionReadRefused(editing.query.error);
  const canRequest =
    canChangeActivity &&
    control.enabled &&
    (!season || season.state === "active") &&
    !control.pendingRequestId &&
    !running;
  useLayoutEffect(() => {
    activeVisit.current = active;
    if (!active) {
      clear("success");
    }
    return () => {
      activeVisit.current = false;
    };
  }, [active, clear]);
  useEffect(
    () => navigation.addListener("blur", () => clear("success")),
    [clear, navigation],
  );

  /** Confirms the accepted season command; mutation callbacks own its read invalidation. */
  async function send(command: "activity" | "request") {
    if (
      !activeVisit.current ||
      !(command === "request" ? canRequest : canChangeActivity)
    ) {
      return;
    }
    try {
      const attempt =
        command === "activity"
          ? editing.activity.mutateAsync({
              enabled: !control.enabled,
            })
          : editing.request.mutateAsync();
      clear();
      const accepted = await attempt;
      if (!season || !activeVisit.current || !navigation.isFocused()) {
        return;
      }
      if (command === "activity") {
        success(activityConfirmation(accepted));
      } else if (
        accepted.pendingRequestId &&
        accepted.cycle?.state !== "running"
      ) {
        // An already running cycle acknowledges no new request.
        success("Relance demandée.");
      }
    } catch {
      error();
    }
  }

  /** Native confirmation belongs to the mounted control; the backend rechecks current permission and eligibility. */
  async function confirmRequest() {
    if (!canRequest) {
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

  const actions = !closed && (
    <View style={styles.actions}>
      <View style={season ? styles.column : styles.action}>
        <Button
          fullWidth
          size={season ? "compact" : "regular"}
          variant="secondary"
          label={control.enabled ? "Mettre en pause" : "Reprendre"}
          disabled={!canChangeActivity}
          loading={editing.activity.isPending}
          onPress={() => send("activity")}
        />
      </View>
      <View style={season ? styles.column : styles.action}>
        <Button
          fullWidth
          size={season ? "compact" : "regular"}
          label={requestLabel()}
          disabled={!canRequest}
          loading={editing.request.isPending}
          onPress={confirmRequest}
        />
      </View>
    </View>
  );
  const metadata = [
    tokens.typography.metadata,
    { color: colors.secondaryText },
  ];
  const drainMessage = running && !control.enabled && (
    <Text style={metadata}>
      Le cycle en cours se termine. Aucun nouveau cycle ne démarrera.
    </Text>
  );
  const badgePaint = {
    color:
      control.enabled && !closed
        ? colors.onSuccessSubtle
        : colors.secondaryText,
    backgroundColor:
      control.enabled && !closed ? colors.successSubtle : colors.raised,
  };

  if (season) {
    const execution = control.pendingRequestId
      ? "En attente de démarrage"
      : running ||
          control.cycle?.state === "interrupted" ||
          !control.lastAttemptAt
        ? cycleLabel()
        : "Aucun cycle en cours.";
    return (
      <Surface style={styles.execution}>
        <View style={styles.heading}>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.headingSm, { color: colors.text }]}
          >
            Exécution
          </Text>
          <Text
            style={[
              styles.compactBadge,
              badgePaint,
              { borderColor: colors.border },
            ]}
          >
            {controlStatus()}
          </Text>
        </View>
        {season.state === "preparing" && (
          <Text style={metadata}>Saison à activer</Text>
        )}
        {closed && (
          <Text style={metadata}>Saison clôturée · historique conservé</Text>
        )}
        <Text style={metadata}>{execution}</Text>
        {drainMessage}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.dates}>
          <View style={styles.date}>
            <Text style={metadata}>Dernière tentative</Text>
            <Text style={[tokens.typography.label, { color: colors.text }]}>
              {control.lastAttemptAt
                ? formatCollectionTimestamp(control.lastAttemptAt, "compact")
                : "Jamais"}
            </Text>
          </View>
          <View style={styles.date}>
            <Text style={metadata}>Dernier succès complet</Text>
            <Text style={[tokens.typography.label, { color: colors.text }]}>
              {control.lastSuccessAt
                ? formatCollectionTimestamp(control.lastSuccessAt, "compact")
                : "Aucun"}
            </Text>
          </View>
        </View>
        {actions}
      </Surface>
    );
  }

  return (
    <Surface>
      <View style={styles.heading}>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Collecte
        </Text>
        <Text style={[styles.badge, badgePaint]}>{controlStatus()}</Text>
      </View>
      {actions}
      {control.pendingRequestId && (
        <Text style={metadata}>En attente de démarrage</Text>
      )}
      <Text style={[tokens.typography.strong, { color: colors.text }]}>
        {cycleLabel()}
      </Text>
      {drainMessage}
      <Text style={metadata}>
        Dernière tentative :{" "}
        {control.lastAttemptAt
          ? formatCollectionTimestamp(control.lastAttemptAt)
          : "jamais"}
      </Text>
      <Text style={metadata}>
        Dernier succès complet :{" "}
        {control.lastSuccessAt
          ? formatCollectionTimestamp(control.lastSuccessAt)
          : "aucun"}
      </Text>
    </Surface>
  );
}

/** The surrounding read owns the pending announcement for this execution card. */
export function CollectionExecutionSkeleton() {
  const { colors } = useTheme();
  return (
    <Surface style={styles.execution}>
      <View style={styles.heading}>
        <TextSkeleton role="title" width="38%" />
        <TextSkeleton role="metadata" width="21%" />
      </View>
      <TextSkeleton role="metadata" width="52%" />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.dates}>
        {[0, 1].map((column) => (
          <View key={column} style={styles.date}>
            <TextSkeleton role="metadata" width="88%" />
            <TextSkeleton role="label" width="66%" />
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        {[0, 1].map((column) => (
          <View key={column} style={[styles.column, styles.compactActionSlot]}>
            <Skeleton
              height={tokens.size.control.compact}
              radius={tokens.radius.full}
            />
          </View>
        ))}
      </View>
    </Surface>
  );
}

/** Acknowledging pause does not interrupt a cycle that has already started. */
function activityConfirmation(accepted: CollectionControlResponse) {
  if (accepted.enabled) {
    return "Collecte réactivée.";
  }
  return accepted.cycle?.state === "running"
    ? "Pause demandée. Le cycle en cours se termine."
    : "Collecte mise en pause.";
}

const styles = StyleSheet.create({
  execution: { gap: tokens.spacing.sm },
  divider: { height: tokens.border.thin },
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
  compactBadge: {
    ...tokens.typography.metadata,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs - tokens.border.thin,
  },
  dates: {
    flexDirection: "row",
    gap: tokens.spacing.lg,
  },
  date: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  column: { flex: 1, minWidth: 0 },
  compactActionSlot: {
    minHeight: tokens.touch.minimum,
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.layout.actions.gap,
  },
  action: {
    flexBasis: "auto",
    flexGrow: 1,
    minWidth: 110,
    maxWidth: "100%",
  },
});
