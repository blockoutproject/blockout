import React, {useCallback, useMemo} from "react";
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View,} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {useSessionActions, useSessionState} from "@/src/modules/session/providers/SessionContext";
import MaskedImage from "@/src/shared/ui/images/MaskedImage";
import AppStatusLayout from "@/src/components/appStatus/AppStatusLayout";
import {CORNERS} from "@/src/shared/theme/tokens";

const MaintenancePage: React.FC = () => {
  const {
    appStatus,
    isAppStatusLoading,
    canBypassMaintenance,
  } = useSessionState();
  const {refetchAppStatus, bypassMaintenance} = useSessionActions();

  const theme = useAppTheme();
  const {message, imageUrl} = appStatus ?? {
    message: null,
    imageUrl: null,
  };

  const displayMessage = useMemo(
    () =>
      message ??
      "On prépare une nouvelle version de l’application. Quelques minutes et tout sera de retour.",
    [message],
  );

  const handleRetry = useCallback(async () => {
    await Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Medium,
    ).catch(() => {
    });
    refetchAppStatus();
  }, [refetchAppStatus]);

  const handleBypass = useCallback(async () => {
    if (!canBypassMaintenance) return;
    await Haptics.selectionAsync().catch(() => {
    });
    bypassMaintenance();
  }, [bypassMaintenance, canBypassMaintenance]);

  return (
    <AppStatusLayout footer="Merci pour ta patience !">
      <View style={styles.cardWrapper}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.warning,
            },
          ]}
        >
          <View style={styles.headerSection}>
            <View
              style={[
                styles.pill,
                {backgroundColor: theme.backgroundSecondary},
              ]}
            >
              <MaterialCommunityIcons
                name="tools"
                size={18}
                color={theme.warning}
              />
              <Text
                style={[
                  styles.pillText,
                  {color: theme.warning},
                ]}
              >
                Maintenance en cours
              </Text>
            </View>

            <Text
              style={[styles.title, {color: theme.text}]}
              numberOfLines={2}
            >
              On peaufine Blockout
            </Text>
          </View>

          <View style={styles.illustrationSection}>
            <MaskedImage
              uri={imageUrl ?? undefined}
              size={250}
              radius={26}
            />
          </View>

          <View style={styles.messageSection}>
            <Text
              style={[
                styles.messageText,
                {color: theme.textInactive},
              ]}
            >
              {displayMessage}
            </Text>
          </View>

          <View style={styles.actionsSection}>
            {isAppStatusLoading ? (
              <ActivityIndicator color={theme.text}/>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleRetry}
                  activeOpacity={0.85}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor:
                      theme.backgroundSecondary,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="reload"
                    size={18}
                    color={theme.text}
                  />
                  <Text
                    style={[
                      styles.primaryButtonText,
                      {color: theme.text},
                    ]}
                  >
                    Réessayer
                  </Text>
                </TouchableOpacity>

                {!!canBypassMaintenance && (
                  <TouchableOpacity
                    onPress={handleBypass}
                    activeOpacity={0.85}
                    style={[
                      styles.bypassButton,
                      {
                        borderColor:
                        theme.borderSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bypassButtonText,
                        {color: theme.textInactive},
                      ]}
                    >
                      Accéder à l’application
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </AppStatusLayout>
  );
};

export default MaintenancePage;

const styles = StyleSheet.create({
  cardWrapper: {
    width: "100%",
    maxWidth: 430,
    marginHorizontal: 6,
    alignSelf: "center",
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
    gap: 18,
  },
  headerSection: {
    width: "100%",
    alignItems: "flex-start",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  illustrationSection: {
    width: "100%",
    alignItems: "center",
  },
  messageSection: {
    width: "100%",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  actionsSection: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: CORNERS,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: CORNERS,
    paddingVertical: 10,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    fontWeight: "800",
    fontSize: 15,
  },
  bypassButton: {
    marginTop: 4,
    borderRadius: CORNERS,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "center",
  },
  bypassButtonText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
