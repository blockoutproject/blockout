import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  iconSize,
  borderWidth,
  fontWeight,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { useApis } from "@/src/shared/providers/api-provider";
import FormCard from "@/src/shared/ui/form/form-card";
import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";
import { useFormSheetBinding } from "@/src/shared/ui/form/form-sheet";
import { getMatchLiveLinkErrorMessage } from "@/src/modules/match/view-models/match-live-link-errors";

export type MatchLiveLinkDeleteFormProps = {
  matchId: number;
  liveUrl?: string | null;
  onSuccess: () => void;
};

const MatchLiveLinkDeleteForm: React.FC<MatchLiveLinkDeleteFormProps> = ({
  matchId,
  liveUrl,
  onSuccess,
}) => {
  const theme = useAppTheme();
  const { mobile } = useApis();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const canSubmit = !loading;

  const handleDelete = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await mobile.matches.deleteMatchLiveLink(matchId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch (err) {
      const msg = getMatchLiveLinkErrorMessage(err);
      setApiError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [matchId, mobile, onSuccess]);

  useFormSheetBinding({
    submit: handleDelete,
    loading,
    canSubmit,
  });

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FormCard title="Supprimer le lien du live">
          <View style={styles.warningRow}>
            <View
              style={[
                styles.warningIconWrap,
                { backgroundColor: theme.error + "22" },
              ]}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={iconSize.card}
                color={theme.error}
              />
            </View>
            <View style={styles.warningTextBlock}>
              <Text style={[styles.warningTitle, { color: theme.error }]}>
                Cette action est irréversible
              </Text>
              <Text
                style={[styles.warningSubtitle, { color: theme.textInactive }]}
              >
                Le lien ne sera plus visible sur la fiche du match. Tu pourras
                toujours proposer un nouveau lien, qui sera à nouveau vérifié.
              </Text>
            </View>
          </View>

          {!!liveUrl && (
            <View
              style={[styles.urlBlock, { borderColor: theme.borderSecondary }]}
            >
              <Text style={[styles.urlLabel, { color: theme.textInactive }]}>
                Lien actuel
              </Text>
              <Text
                style={[styles.urlValue, { color: theme.text }]}
                numberOfLines={2}
              >
                {liveUrl}
              </Text>
            </View>
          )}
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </>
  );
};

export default MatchLiveLinkDeleteForm;

const styles = StyleSheet.create({
  scroll: {
    gap: spacing[3],
    padding: spacing[2],
    paddingBottom: 100,
  },
  warningRow: {
    flexDirection: "row",
    gap: spacing.compact,
    alignItems: "flex-start",
  },
  warningIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  warningTextBlock: {
    flex: 1,
    gap: spacing[1],
  },
  warningTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: fontWeight.bold,
  },
  warningSubtitle: {
    fontSize: typography.label.fontSize,
    fontWeight: fontWeight.medium,
  },
  urlBlock: {
    marginTop: spacing.inset,
    padding: spacing.compact,
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
    borderStyle: "dashed",
  },
  urlLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: fontWeight.semiBold,
    marginBottom: spacing[1],
    textTransform: "uppercase",
  },
  urlValue: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.medium,
  },
});
