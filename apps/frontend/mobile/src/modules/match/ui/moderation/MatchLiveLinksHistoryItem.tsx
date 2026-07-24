import React, { useCallback, useMemo } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/shared/theme";
import {
  LiveLinkStatusEnum,
  LiveProviderEnum,
  MatchLiveLinkHistoryResponse,
} from "@/src/shared/generated/models";

type Props = {
  link: MatchLiveLinkHistoryResponse;
  onApprove?: (link: MatchLiveLinkHistoryResponse) => void;
  onReject?: (link: MatchLiveLinkHistoryResponse) => void;
  onDeleteActive?: (link: MatchLiveLinkHistoryResponse) => void;
  onReactivate?: (link: MatchLiveLinkHistoryResponse) => void;
};

const formatDateTime = (value?: string | number | null) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const MatchLiveLinksHistoryItem: React.FC<Props> = ({
  link,
  onApprove,
  onReject,
  onDeleteActive,
  onReactivate,
}) => {
  const theme = useAppTheme();

  const createdAtLabel = useMemo(
    () => formatDateTime(link.createdAt),
    [link.createdAt],
  );

  const lastUpdateLabel = useMemo(
    () => (link.lastUpdate ? formatDateTime(link.lastUpdate) : ""),
    [link.lastUpdate],
  );

  const statusConfig = useMemo(() => {
    switch (link.status as LiveLinkStatusEnum) {
      case "PENDING":
        return {
          label: "En attente",
          backgroundColor: theme.surfaceSecondary ?? theme.surface,
          color: theme.warning ?? theme.text,
        };
      case "ACTIVE":
        return {
          label: "Actif",
          backgroundColor: theme.surfaceSecondary ?? theme.surface,
          color: theme.success,
        };
      case "REJECTED":
        return {
          label: "Rejeté",
          backgroundColor: theme.surfaceSecondary ?? theme.surface,
          color: theme.error,
        };
      case "DEACTIVATED":
        return {
          label: "Désactivé",
          backgroundColor: theme.surfaceSecondary ?? theme.surface,
          color: theme.textInactive,
        };
      case "BANNED":
        return {
          label: "Banni",
          backgroundColor: theme.surfaceSecondary ?? theme.surface,
          color: theme.error,
        };
      case "EXPIRED":
        return {
          label: "Expiré",
          backgroundColor: theme.borderSecondary,
          color: theme.text,
        };
      default:
        return {
          label: "Inconnu",
          backgroundColor: theme.borderSecondary,
          color: theme.textInactive,
        };
    }
  }, [link.status, theme]);

  const providerIconName = useMemo(() => {
    switch (link.provider as LiveProviderEnum | null) {
      case "YOUTUBE":
        return "youtube";
      case "TWITCH":
        return "twitch";
      case "FACEBOOK":
        return "facebook";
      default:
        return "video-outline";
    }
  }, [link.provider]);

  const handleOpenUrl = useCallback(async () => {
    if (!link.url) return;
    try {
      await Haptics.selectionAsync();
      const canOpen = await Linking.canOpenURL(link.url);
      if (canOpen) {
        await Linking.openURL(link.url);
      }
    } catch {
      // ignore
    }
  }, [link.url]);

  const isPending = link.status === "PENDING";
  const isActive = link.status === "ACTIVE";
  const isReactivable =
    link.status === "REJECTED" ||
    link.status === "EXPIRED" ||
    link.status === "BANNED" ||
    link.status === "DEACTIVATED";

  const canApprove = isPending && !!onApprove;
  const canReject = isPending && !!onReject;
  const canDeleteActive = isActive && !!onDeleteActive;
  const canReactivate = isReactivable && !!onReactivate;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
      testID={`match-live-history-item-${link.id}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusConfig.backgroundColor },
            ]}
          >
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>

          {link.reportCount > 0 && (
            <View style={styles.reportPill}>
              <MaterialCommunityIcons
                name="flag-outline"
                size={13}
                color={theme.error}
              />
              <Text style={[styles.reportText, { color: theme.error }]}>
                {link.reportCount}
              </Text>
            </View>
          )}
        </View>

        {!!link.provider && (
          <View style={styles.providerRow}>
            <MaterialCommunityIcons
              name={providerIconName}
              size={16}
              color={theme.textInactive}
            />
            <Text style={[styles.providerText, { color: theme.textInactive }]}>
              {link.provider}
            </Text>
          </View>
        )}
      </View>

      {!!link.url && (
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel={`Ouvrir le lien ${link.provider}`}
          onPress={handleOpenUrl}
          activeOpacity={0.8}
          style={styles.urlRow}
          testID={`match-live-history-open-action-${link.id}`}
        >
          <MaterialCommunityIcons
            name="link-variant"
            size={15}
            color={theme.primary}
          />
          <Text
            style={[styles.urlText, { color: theme.primary }]}
            numberOfLines={2}
          >
            {link.url}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.metaBlock}>
        {!!link.ownerAuth0Id && (
          <Text
            style={[styles.metaText, { color: theme.textInactive }]}
            numberOfLines={1}
          >
            Proposé par : {link.ownerAuth0Id}
          </Text>
        )}

        <Text
          style={[styles.metaText, { color: theme.textInactive }]}
          numberOfLines={1}
        >
          Créé le : {createdAtLabel}
        </Text>

        {!!lastUpdateLabel && (
          <Text
            style={[styles.metaText, { color: theme.textInactive }]}
            numberOfLines={1}
          >
            Dernière mise à jour : {lastUpdateLabel}
          </Text>
        )}
      </View>

      {!!(canApprove || canReject || canDeleteActive || canReactivate) && (
        <View style={styles.actionsRow}>
          {!!canReject && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Refuser le lien"
              onPress={() => onReject?.(link)}
              style={[styles.actionButtonOutline, { borderColor: theme.error }]}
              activeOpacity={0.9}
              testID={`match-live-history-reject-action-${link.id}`}
            >
              <MaterialCommunityIcons
                name="close"
                size={16}
                color={theme.error}
              />
              <Text style={[styles.actionTextOutline, { color: theme.error }]}>
                Refuser
              </Text>
            </TouchableOpacity>
          )}

          {!!canDeleteActive && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Supprimer le lien"
              onPress={() => onDeleteActive?.(link)}
              style={[styles.actionButtonOutline, { borderColor: theme.error }]}
              activeOpacity={0.9}
              testID={`match-live-history-delete-action-${link.id}`}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={16}
                color={theme.error}
              />
              <Text style={[styles.actionTextOutline, { color: theme.error }]}>
                Supprimer
              </Text>
            </TouchableOpacity>
          )}

          {!!canApprove && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Valider le lien"
              onPress={() => onApprove?.(link)}
              style={[
                styles.actionButtonFilled,
                { backgroundColor: theme.success },
              ]}
              activeOpacity={0.9}
              testID={`match-live-history-approve-action-${link.id}`}
            >
              <MaterialCommunityIcons name="check" size={16} color={"white"} />
              <Text style={[styles.actionTextFilled, { color: "white" }]}>
                Valider
              </Text>
            </TouchableOpacity>
          )}

          {!!canReactivate && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Réactiver le lien"
              onPress={() => onReactivate?.(link)}
              style={[
                styles.actionButtonFilled,
                { backgroundColor: theme.primary },
              ]}
              activeOpacity={0.9}
              testID={`match-live-history-reactivate-action-${link.id}`}
            >
              <MaterialCommunityIcons
                name="backup-restore"
                size={16}
                color={"white"}
              />
              <Text style={[styles.actionTextFilled, { color: "white" }]}>
                Réactiver
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default MatchLiveLinksHistoryItem;

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  reportPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#FFE5E5",
  },
  reportText: {
    fontSize: 11,
    fontWeight: "700",
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  providerText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  urlText: {
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
    flex: 1,
  },
  metaBlock: {
    gap: 2,
  },
  metaText: {
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  actionButtonOutline: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  actionTextOutline: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionButtonFilled: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  actionTextFilled: {
    fontSize: 12,
    fontWeight: "700",
  },
});
