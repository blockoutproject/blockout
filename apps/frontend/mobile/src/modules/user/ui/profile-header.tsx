import React, { useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { iconSize, layout, useAppTheme } from "@/src/shared/theme";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheetCustomPage from "@/src/shared/ui/bottom-sheet/bottom-sheet-custom-page";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";
import MatchLiveModerationScreen from "@/src/modules/match/ui/moderation/match-live-moderation-screen";
import RawDivisionMappingScreen from "@/src/modules/raw-division-mapping/ui/raw-division-mapping-screen";
import DivisionScreen from "@/src/modules/division/ui/division-screen";
import AdminScreen from "@/src/modules/administration/ui/admin-screen";
import { useSessionState } from "@/src/modules/session/providers/session-context";
import { IconAction } from "@/src/shared/ui/icon-action";

export type UserHeaderProps = {
  title: string;
  onOpenReport: () => void;
};

const ProfileHeader: React.FC<UserHeaderProps> = ({ title, onOpenReport }) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isMaintenance } = useSessionState();

  const liveLinkModerationSheetRef = useRef<BottomSheetModal>(null);
  const mappingSheetRef = useRef<BottomSheetModal>(null);
  const divisionSheetRef = useRef<BottomSheetModal>(null);
  const scraperSheetRef = useRef<BottomSheetModal>(null);

  const { allowed: canAccessLiveLinkModeration } = useHasScopes([
    "moderate:match_live_link",
  ]);

  const { allowed: canAccessRawDivisionMappings } = useHasScopes([
    "read:raw_division_mapping",
    "update:raw_division_mapping",
  ]);

  const { allowed: canAccessDivisions } = useHasScopes([
    "read:divisions",
    "update:divisions",
    "create:divisions",
  ]);

  const { allowed: canAdminManagement } = useHasScopes([
    "read:scrapers",
    "update:scrapers",
    "update:maintenance",
  ]);

  const openSheet = useCallback(
    (ref: React.RefObject<BottomSheetModal | null>) => () => {
      ref.current?.present();
    },
    [],
  );

  const hasAnyAdmin =
    canAccessRawDivisionMappings ||
    canAccessDivisions ||
    canAccessLiveLinkModeration ||
    canAdminManagement;

  return (
    <>
      <View style={[{ paddingTop: insets.top }]} testID="profile-header">
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.actions}>
            {!!hasAnyAdmin && (
              <>
                {!!canAccessRawDivisionMappings && (
                  <IconAction
                    onPress={openSheet(mappingSheetRef)}
                    accessibilityLabel="Gérer les correspondances de divisions"
                    testID="profile-division-mappings-action"
                  >
                    <MaterialCommunityIcons
                      name="alpha-m-circle"
                      size={iconSize.navigation}
                      color={theme.text}
                    />
                  </IconAction>
                )}
                {!!canAccessDivisions && (
                  <IconAction
                    onPress={openSheet(divisionSheetRef)}
                    accessibilityLabel="Gérer les divisions"
                    testID="profile-divisions-action"
                  >
                    <MaterialCommunityIcons
                      name="alpha-d-circle"
                      size={iconSize.navigation}
                      color={theme.text}
                    />
                  </IconAction>
                )}
                {!!canAccessLiveLinkModeration && (
                  <IconAction
                    onPress={openSheet(liveLinkModerationSheetRef)}
                    accessibilityLabel="Modérer les liens de direct"
                    testID="profile-live-link-moderation-action"
                  >
                    <MaterialCommunityIcons
                      name="video-check-outline"
                      size={iconSize.navigation}
                      color={theme.text}
                    />
                  </IconAction>
                )}
                {!!canAdminManagement && (
                  <IconAction
                    onPress={openSheet(scraperSheetRef)}
                    accessibilityLabel="Gérer l’application"
                    testID="profile-admin-action"
                  >
                    <MaterialCommunityIcons
                      name="power-standby"
                      size={iconSize.navigation}
                      color={isMaintenance ? theme.error : theme.text}
                    />
                  </IconAction>
                )}
              </>
            )}

            <IconAction
              onPress={onOpenReport}
              accessibilityLabel="Signaler un problème"
              testID="profile-report-action"
            >
              <MaterialCommunityIcons
                name="flag-outline"
                size={iconSize.navigation}
                color={theme.text}
              />
            </IconAction>
          </View>
        </View>
      </View>

      <BottomSheetCustomPage ref={liveLinkModerationSheetRef}>
        <MatchLiveModerationScreen />
      </BottomSheetCustomPage>

      <BottomSheetCustomPage ref={mappingSheetRef}>
        <RawDivisionMappingScreen />
      </BottomSheetCustomPage>

      <BottomSheetCustomPage ref={divisionSheetRef}>
        <DivisionScreen />
      </BottomSheetCustomPage>

      <BottomSheetCustomPage ref={scraperSheetRef}>
        <AdminScreen />
      </BottomSheetCustomPage>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    height: layout.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    flex: 1,
    marginRight: 10,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default ProfileHeader;
