import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useCurrentAccount } from "../api/use-current-account";
import { PublicAccountLinks } from "../components/public-account-links";
import { useAccountSession } from "../session/account-session-provider";

/** Current ordinary admission; identification reads do not grant profile navigation. */
export interface ProfileScreenProps {
  admitted: boolean;
}

/** Minimal read-only profile from local account data; edits, photos and erasure retain their later owners. */
export function ProfileScreen({ admitted }: ProfileScreenProps) {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const router = useRouter();
  const { colors } = useTheme();
  const missing =
    account.error instanceof ApiError && account.error.status === 404;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {!admitted ? (
          <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
        ) : (
          <>
            <Text
              accessibilityRole="header"
              style={[tokens.typography.heading, { color: colors.text }]}
            >
              Mon profil
            </Text>
            {session.status === "restoring" ||
            (session.status === "authenticated" && account.isPending) ? (
              <RequestLoading />
            ) : session.status !== "authenticated" ? (
              <Button
                label="Se connecter"
                onPress={() => router.replace("/sign-in")}
              />
            ) : account.isError ? (
              <>
                <RequestError
                  message={
                    missing
                      ? "Votre compte Blockout est introuvable."
                      : "Votre profil Blockout est indisponible."
                  }
                  onRetry={() => void account.refetch()}
                  retrying={account.isFetching}
                />
                {missing && (
                  <Button
                    label="Se connecter"
                    onPress={() => router.replace("/sign-in")}
                  />
                )}
              </>
            ) : (
              account.data && (
                <View
                  style={[
                    styles.profile,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Image
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel="Avatar par défaut"
                    source={require("../../../../assets/accounts/user-round.svg")}
                    tintColor={colors.icon}
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.mediaPlaceholder },
                    ]}
                    contentFit="contain"
                  />
                  <Text
                    style={[tokens.typography.label, { color: colors.text }]}
                  >
                    Pseudo
                  </Text>
                  <Text
                    style={[tokens.typography.body, { color: colors.text }]}
                  >
                    {account.data.username}
                  </Text>
                  <Text
                    style={[tokens.typography.label, { color: colors.text }]}
                  >
                    Adresse e-mail
                  </Text>
                  <Text
                    style={[tokens.typography.body, { color: colors.text }]}
                  >
                    {account.data.email}
                  </Text>
                </View>
              )
            )}
            <Button
              label="Continuer en tant qu’invité"
              onPress={() => router.replace("/")}
            />
            <PublicAccountLinks />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.lg },
  profile: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: tokens.radius.media,
    alignSelf: "center",
  },
});
