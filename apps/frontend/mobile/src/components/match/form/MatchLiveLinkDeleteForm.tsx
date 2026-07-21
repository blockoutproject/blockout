// FILE: src/components/match/form/MatchLiveLinkDeleteForm.tsx

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {StyleSheet, Text, View} from "react-native";
import {BottomSheetScrollView} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import {MaterialCommunityIcons} from "@expo/vector-icons";

import {useAppTheme} from "@/src/context/ThemeProvider";
import {useApis} from "@/src/context/ApiProvider";
import FormCard from "@/src/components/common/form/FormCard";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";
import {getLiveLinkErrorMessage, MatchLiveLinkFormExternalState,} from "./MatchLiveLinkForm";

export type MatchLiveLinkDeleteFormProps = {
  matchId: number;
  liveUrl?: string | null;
  onSuccess: () => void;
  onRegisterSubmit: (submit: () => void) => void;
  onStateChange?: (state: MatchLiveLinkFormExternalState) => void;
};

const MatchLiveLinkDeleteForm: React.FC<MatchLiveLinkDeleteFormProps> = ({
                                                                           matchId,
                                                                           liveUrl,
                                                                           onSuccess,
                                                                           onRegisterSubmit,
                                                                           onStateChange,
                                                                         }) => {
  const theme = useAppTheme();
  const {mobile} = useApis();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const canSubmit = useMemo(() => !loading, [loading]);

  const handleDelete = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      await Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium,
      );
      await mobile.matches.deleteMatchLiveLink(matchId);
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
      onSuccess();
    } catch (err) {
      const msg = getLiveLinkErrorMessage(err);
      setApiError(msg);
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );
    } finally {
      setLoading(false);
    }
  }, [matchId, mobile, onSuccess]);

  useEffect(() => {
    onRegisterSubmit(handleDelete);
  }, [handleDelete, onRegisterSubmit]);

  useEffect(() => {
    onStateChange?.({loading, canSubmit});
  }, [loading, canSubmit, onStateChange]);

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
                {backgroundColor: theme.error + "22"},
              ]}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={22}
                color={theme.error}
              />
            </View>
            <View style={styles.warningTextBlock}>
              <Text
                style={[
                  styles.warningTitle,
                  {color: theme.error},
                ]}
              >
                Cette action est irréversible
              </Text>
              <Text
                style={[
                  styles.warningSubtitle,
                  {color: theme.textInactive},
                ]}
              >
                Le lien ne sera plus visible sur la fiche du
                match. Tu pourras toujours proposer un nouveau
                lien, qui sera à nouveau vérifié.
              </Text>
            </View>
          </View>

          {liveUrl && (
            <View
              style={[
                styles.urlBlock,
                {borderColor: theme.borderSecondary},
              ]}
            >
              <Text
                style={[
                  styles.urlLabel,
                  {color: theme.textInactive},
                ]}
              >
                Lien actuel
              </Text>
              <Text
                style={[
                  styles.urlValue,
                  {color: theme.text},
                ]}
                numberOfLines={2}
              >
                {liveUrl}
              </Text>
            </View>
          )}
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast
        message={apiError}
        onHidden={() => setApiError(null)}
      />
    </>
  );
};

export default MatchLiveLinkDeleteForm;

const styles = StyleSheet.create({
  scroll: {
    gap: 12,
    padding: 8,
    paddingBottom: 100
  },
  warningRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  warningIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  warningTextBlock: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  warningSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  urlBlock: {
    marginTop: 14,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  urlLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  urlValue: {
    fontSize: 12,
    fontWeight: "500",
  },
});
