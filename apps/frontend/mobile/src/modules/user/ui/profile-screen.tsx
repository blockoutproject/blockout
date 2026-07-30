import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, useAppTheme } from "@/src/shared/theme";
import {
  useSessionActions,
  useSessionState,
} from "@/src/modules/session/providers/session-context";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";
import { ReportTypeEnum } from "@/src/shared/generated/models";
import ProfileHero from "@/src/modules/user/ui/profile-hero";
import ProfileHeader from "@/src/modules/user/ui/profile-header";
import ProfileFormSheet from "@/src/modules/user/ui/profile-form-sheet";
import ProfileLegalSection from "@/src/modules/user/ui/profile-legal-section";
import ProfileLegalSheets from "@/src/modules/user/ui/profile-legal-sheets";
import ProfileAccountSection from "@/src/modules/user/ui/profile-account-section";
import ProfileVersion from "@/src/modules/user/ui/profile-version";
import ReportFormSheet from "@/src/modules/report/ui/report-form-sheet";
import { useApis } from "@/src/shared/providers/api-provider";
import GuestUpsellCard from "@/src/modules/session/ui/guest-upsell-card";
import { useOnboardingStore } from "@/src/modules/onboarding/model/onboarding-store";
import { useAdvertising } from "@/src/modules/advertising/providers/advertising-provider";

const ProfileScreen = () => {
  const { mobile } = useApis();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { refetch, signOutSSO } = useSessionActions();
  const { customUser, isGuest } = useSessionState();
  const { allowed: canEdit } = useHasScopes(["update:current_user"]);
  const { resetOnboarding } = useOnboardingStore();
  const { privacyOptionsRequired, showPrivacyOptions } = useAdvertising();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const busy = isLoggingOut || isDeleting;

  const imprintRef = useRef<BottomSheetModal>(null);
  const termsRef = useRef<BottomSheetModal>(null);
  const privacyRef = useRef<BottomSheetModal>(null);
  const formSheetRef = useRef<BottomSheetModal>(null);
  const reportSheetRef = useRef<BottomSheetModal>(null);

  const openLocal = (ref: React.RefObject<BottomSheetModal | null>) => () => {
    Haptics.selectionAsync();
    ref.current?.present();
  };
  const dismissLocal = (ref: React.RefObject<BottomSheetModal | null>) => () =>
    ref.current?.dismiss();

  const openForm = () => {
    if (!customUser) return;
    Haptics.selectionAsync();
    formSheetRef.current?.present();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOutSSO();
    resetOnboarding();
    setIsLoggingOut(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Supprimer mon compte",
      "Cette action est irréversible. Toutes vos données de compte seront supprimées. Confirmez-vous la suppression ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
              await signOutSSO();
              await mobile.users.deleteCurrentUser();
              resetOnboarding();
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error,
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const legalSection = (
    <ProfileLegalSection
      onOpenImprint={openLocal(imprintRef)}
      onOpenTerms={openLocal(termsRef)}
      onOpenPrivacy={openLocal(privacyRef)}
      onOpenAdvertisingPrivacy={
        privacyOptionsRequired ? showPrivacyOptions : undefined
      }
    />
  );

  const scrollContentStyle = [
    styles.scrollContent,
    {
      backgroundColor: theme.background,
      paddingBottom:
        insets.bottom + layout.bottomNavigation + layout.sectionSeparator + 4,
    },
  ];

  const renderContent = () => {
    if (isGuest) {
      return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          testID="profile-scroll"
          contentContainerStyle={scrollContentStyle}
        >
          <GuestUpsellCard />
          {legalSection}
          <ProfileVersion />
        </ScrollView>
      );
    }

    if (!customUser) {
      return (
        <View
          style={[styles.center, { backgroundColor: theme.background }]}
          testID="profile-loading"
        >
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContentStyle}
        testID="profile-scroll"
      >
        <ProfileHero
          user={customUser}
          onEdit={canEdit ? openForm : undefined}
        />
        {legalSection}
        <ProfileAccountSection
          busy={busy}
          isLoggingOut={isLoggingOut}
          isDeleting={isDeleting}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container} testID="profile-screen">
      <ProfileHeader
        title="Profil"
        onOpenReport={() => reportSheetRef.current?.present()}
      />
      {renderContent()}

      <ProfileLegalSheets
        imprintRef={imprintRef}
        termsRef={termsRef}
        privacyRef={privacyRef}
        onCloseImprint={dismissLocal(imprintRef)}
        onCloseTerms={dismissLocal(termsRef)}
        onClosePrivacy={dismissLocal(privacyRef)}
      />

      {!isGuest && customUser ? (
        <ProfileFormSheet
          ref={formSheetRef}
          user={customUser}
          onSuccess={() => {
            refetch();
            formSheetRef.current?.dismiss();
          }}
        />
      ) : null}

      <ReportFormSheet
        ref={reportSheetRef}
        context={{
          screen: "Profile",
          defaultType: ReportTypeEnum.DISPLAY_BUG,
        }}
        onSuccess={() => {
          reportSheetRef.current?.dismiss();
        }}
        snapPoint="90%"
        footerLabel="Envoyer"
      />
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 8, gap: 20 },
});
