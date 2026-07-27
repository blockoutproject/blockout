import React, { useCallback, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { layout, useAppTheme } from "@/src/shared/theme";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheetCustomPage from "@/src/shared/ui/bottom-sheet/bottom-sheet-custom-page";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";
import MatchLiveModerationScreen from "@/src/modules/match/ui/moderation/match-live-moderation-screen";
import RawDivisionMappingScreen from "@/src/modules/raw-division-mapping/ui/raw-division-mapping-screen";
import DivisionScreen from "@/src/modules/division/ui/division-screen";
import AdminScreen from "@/src/modules/administration/ui/admin-screen";
import { useSessionState } from "@/src/modules/session/providers/session-context";

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
                  <TouchableOpacity
                    onPress={openSheet(mappingSheetRef)}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Gérer les correspondances de divisions"
                    testID="profile-division-mappings-action"
                  >
                    <MaterialCommunityIcons
                      name="alpha-m-circle"
                      size={28}
                      color={theme.text}
                    />
                  </TouchableOpacity>
                )}
                {!!canAccessDivisions && (
                  <TouchableOpacity
                    onPress={openSheet(divisionSheetRef)}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Gérer les divisions"
                    testID="profile-divisions-action"
                  >
                    <MaterialCommunityIcons
                      name="alpha-d-circle"
                      size={28}
                      color={theme.text}
                    />
                  </TouchableOpacity>
                )}
                {!!canAccessLiveLinkModeration && (
                  <TouchableOpacity
                    onPress={openSheet(liveLinkModerationSheetRef)}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Modérer les liens de direct"
                    testID="profile-live-link-moderation-action"
                  >
                    <MaterialCommunityIcons
                      name="video-check-outline"
                      size={28}
                      color={theme.text}
                    />
                  </TouchableOpacity>
                )}
                {!!canAdminManagement && (
                  <TouchableOpacity
                    onPress={openSheet(scraperSheetRef)}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Gérer l’application"
                    testID="profile-admin-action"
                  >
                    <MaterialCommunityIcons
                      name="power-standby"
                      size={28}
                      color={isMaintenance ? theme.error : theme.text}
                    />
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity
              onPress={onOpenReport}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Signaler un problème"
              testID="profile-report-action"
            >
              <MaterialCommunityIcons
                name="flag-outline"
                size={28}
                color={theme.text}
              />
            </TouchableOpacity>
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

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

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
    gap: 6,
  },
});

export default ProfileHeader;
