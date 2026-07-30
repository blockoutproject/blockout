import React, { memo, useCallback } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  borderWidth,
  colors,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
import { Pill } from "@/src/shared/ui/pill";
import { MatchLiveLinkHistoryResponse } from "@/src/shared/generated/models";
import {
  formatModerationDateTime,
  getLiveLinkModerationActions,
  getLiveLinkStatusPresentation,
  getLiveProviderIcon,
} from "@/src/modules/match/view-models/live-link-moderation";

type Props = {
  link: MatchLiveLinkHistoryResponse;
  onApprove?: (link: MatchLiveLinkHistoryResponse) => void;
  onReject?: (link: MatchLiveLinkHistoryResponse) => void;
  onDeleteActive?: (link: MatchLiveLinkHistoryResponse) => void;
  onReactivate?: (link: MatchLiveLinkHistoryResponse) => void;
};

const MatchLiveLinksHistoryItem: React.FC<Props> = ({
  link,
  onApprove,
  onReject,
  onDeleteActive,
  onReactivate,
}) => {
  const theme = useAppTheme();

  const createdAtLabel = formatModerationDateTime(link.createdAt);
  const lastUpdateLabel = link.lastUpdate
    ? formatModerationDateTime(link.lastUpdate)
    : "";
  const statusConfig = getLiveLinkStatusPresentation(link.status, theme);
  const providerIconName = getLiveProviderIcon(link.provider);

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

  const availableActions = getLiveLinkModerationActions(link.status);
  const canApprove = availableActions.approve && !!onApprove;
  const canReject = availableActions.reject && !!onReject;
  const canDeleteActive = availableActions.deleteActive && !!onDeleteActive;
  const canReactivate = availableActions.reactivate && !!onReactivate;

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
          <Pill
            label={statusConfig.label}
            size="sm"
            borderWidth={0}
            backgroundColor={statusConfig.backgroundColor}
            textColor={statusConfig.color}
          />

          {link.reportCount > 0 && (
            <Pill
              label={String(link.reportCount)}
              leftIcon="flag-outline"
              size="sm"
              borderWidth={0}
              backgroundColor={withAlpha(theme.error, 0.1)}
              textColor={theme.error}
              iconColor={theme.error}
            />
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
            <Pill
              accessibilityLabel="Refuser le lien"
              onPress={() => onReject?.(link)}
              label="Refuser"
              leftIcon="close"
              size="lg"
              borderWidth={borderWidth.medium}
              backgroundColor="transparent"
              borderColor={theme.error}
              textColor={theme.error}
              iconColor={theme.error}
              testID={`match-live-history-reject-action-${link.id}`}
            />
          )}

          {!!canDeleteActive && (
            <Pill
              accessibilityLabel="Supprimer le lien"
              onPress={() => onDeleteActive?.(link)}
              label="Supprimer"
              leftIcon="delete-outline"
              size="lg"
              borderWidth={borderWidth.medium}
              backgroundColor="transparent"
              borderColor={theme.error}
              textColor={theme.error}
              iconColor={theme.error}
              testID={`match-live-history-delete-action-${link.id}`}
            />
          )}

          {!!canApprove && (
            <Pill
              accessibilityLabel="Valider le lien"
              onPress={() => onApprove?.(link)}
              label="Valider"
              leftIcon="check"
              size="lg"
              borderWidth={0}
              backgroundColor={theme.success}
              textColor={colors.text.primary}
              iconColor={colors.icon.primary}
              testID={`match-live-history-approve-action-${link.id}`}
            />
          )}

          {!!canReactivate && (
            <Pill
              accessibilityLabel="Réactiver le lien"
              onPress={() => onReactivate?.(link)}
              label="Réactiver"
              leftIcon="backup-restore"
              size="lg"
              borderWidth={0}
              backgroundColor={theme.primary}
              textColor={colors.text.primary}
              iconColor={colors.icon.primary}
              testID={`match-live-history-reactivate-action-${link.id}`}
            />
          )}
        </View>
      )}
    </View>
  );
};

export default memo(MatchLiveLinksHistoryItem);

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
});
