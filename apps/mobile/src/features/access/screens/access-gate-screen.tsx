import { ErrorState } from "../../../shared/components/state-card";
import { applicationUpdateMessage } from "../application-update-message";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PublicMaintenanceResponse } from "../../../../.generated/schemas/index.zod";
import { IconButton } from "../../../shared/components/icon-button";
import { Button } from "../../../shared/components/button";
import { BrandMark } from "../../../shared/components/brand-mark";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { GateBackdrop } from "../components/gate-backdrop";
import { StoreAction } from "../components/store-action";
import { useAccessAdmission } from "../queries/use-access-admission";
import { useApplicationAccess } from "../queries/use-application-access";
import { accessPresentation } from "../state/access-presentation";

/** Presentation of current admission data; error retry, store handoff and operator entry keep their distinct intents. */
interface GateViewProps {
  gate: ReturnType<typeof accessPresentation>["gate"];
  maintenance?: Pick<PublicMaintenanceResponse, "message" | "imageUrl">;
  updateMessage?: string | null;
  storeUrl?: string | null;
  checking?: boolean;
  onRefresh?: () => void;
  onAdministration?: () => void;
  /** Local presentation only; closing a preview never changes admission. */
  onClose?: () => void;
}

/** Simple admission feedback shares the useful-area placement; maintenance and update retain their domain stage. */
function GateView({
  gate,
  maintenance,
  updateMessage,
  storeUrl,
  checking = false,
  onRefresh,
  onAdministration,
  onClose,
}: GateViewProps) {
  const { colors } = useTheme();
  const update = gate === "update";
  const inMaintenance = gate === "maintenance";
  const simple = gate === "checking" || gate === "unavailable";
  const image = inMaintenance ? maintenance?.imageUrl : null;
  let title = "";
  let badge = gate === "checking" ? "VÉRIFICATION" : "INDISPONIBLE";
  let message: string | null | undefined;
  if (inMaintenance) {
    title = "Blockout est en maintenance";
    badge = "MAINTENANCE";
    message = maintenance?.message;
  } else if (update) {
    title = "Mets Blockout\nà jour.";
    badge = "MISE À JOUR";
    message = updateMessage ?? applicationUpdateMessage;
  }
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <View style={styles.identity}>
          <BrandMark />
          <Text style={[styles.brand, { color: colors.text }]}>BLOCKOUT</Text>
        </View>
        <Text
          style={[
            styles.badge,
            { color: colors.text, borderColor: colors.border },
          ]}
        >
          {onClose ? "APERÇU" : badge}
        </Text>
        {onClose && (
          <IconButton label="Fermer" onPress={onClose}>
            <X
              accessible={false}
              size={tokens.size.actionIcon}
              color={colors.icon}
            />
          </IconButton>
        )}
      </View>
      <ScrollView
        contentContainerStyle={simple ? styles.stateContent : styles.scroll}
        alwaysBounceVertical
        refreshControl={
          !onClose && onRefresh && gate !== "checking" ? (
            <DataRefreshControl refreshing={checking} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {simple ? (
          <ScreenState>
            {gate === "checking" ? (
              <RequestLoading />
            ) : (
              <ErrorState onRetry={onRefresh} retrying={checking} />
            )}
          </ScreenState>
        ) : (
          <>
            <View style={styles.stage}>
              <GateBackdrop />
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {!update && (
                  <View style={styles.mediaInset}>
                    <GateImage key={image ?? "placeholder"} uri={image} />
                  </View>
                )}
                <Text
                  accessibilityRole="header"
                  accessibilityLabel={title.replace("\n", " ")}
                  style={[
                    styles.heading,
                    update && styles.updateHeading,
                    { color: colors.text },
                  ]}
                >
                  {title}
                </Text>
                <Text style={[styles.message, { color: colors.secondaryText }]}>
                  {message}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              {update && storeUrl ? (
                <StoreAction key={storeUrl} url={storeUrl} />
              ) : update && onClose ? (
                <Button
                  fullWidth
                  label="Mettre à jour l’application"
                  onPress={undefined}
                  disabled
                />
              ) : null}
              {inMaintenance && onAdministration && (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Accès administrateur"
                  onPress={onAdministration}
                  style={({ pressed }) => [
                    styles.operator,
                    { opacity: pressed ? tokens.opacity.pressed : 1 },
                  ]}
                >
                  <Text
                    style={[tokens.typography.strong, { color: colors.text }]}
                  >
                    Accès administrateur
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Native decode feedback belongs to one mounted illustration and is discarded when its URI changes. */
function GateImage({ uri }: { uri?: string | null }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return uri && !failed ? (
    <Image
      source={{ uri }}
      contentFit="contain"
      accessible={false}
      style={styles.media}
      onError={() => setFailed(true)}
    />
  ) : (
    <View
      style={[
        styles.placeholder,
        {
          backgroundColor: colors.mediaPlaceholder,
          borderColor: colors.secondaryText,
        },
      ]}
    >
      <Text
        style={[
          styles.copy,
          { color: colors.secondaryText, textAlign: "center" },
        ]}
      >
        Illustration à définir
      </Text>
    </View>
  );
}

/** Previews unsaved copy and the validated current-platform store action without publishing or changing admission. */
export function ApplicationVersionsPreview({
  message,
  storeUrl,
  onClose,
}: {
  message: string | null;
  storeUrl: string | null;
  onClose(): void;
}) {
  return (
    <GateView
      gate="update"
      updateMessage={message}
      storeUrl={storeUrl}
      onClose={onClose}
    />
  );
}

/** Displays public results even while first-install credential initialization has not mounted Auth0. */
export function StartupAccessGate() {
  const access = useApplicationAccess();
  const presentation = accessPresentation(access.snapshot);
  return (
    <GateView
      gate={presentation.ordinary ? "checking" : presentation.gate}
      maintenance={access.snapshot.maintenance}
      updateMessage={access.snapshot.versions?.message}
      storeUrl={presentation.versions?.storeUrl}
      checking={access.checking}
      onRefresh={() => void access.retry()}
    />
  );
}

/** Renders the current block and offers technical administration only when its landing page has a usable command. */
export function AccessGateScreen() {
  const access = useAccessAdmission();
  const router = useRouter();
  return (
    <GateView
      gate={access.gate}
      maintenance={access.snapshot.maintenance}
      updateMessage={access.snapshot.versions?.message}
      storeUrl={access.versions?.storeUrl}
      checking={access.checking}
      onRefresh={access.retry}
      onAdministration={
        access.administration ? () => router.push("/administration") : undefined
      }
    />
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    marginHorizontal: tokens.spacing.section,
    minHeight: 53,
    paddingBottom: tokens.spacing.section,
    borderBottomWidth: tokens.borderWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  brand: tokens.typography.navigation,
  badge: {
    ...tokens.typography.metadata,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.badge,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  scroll: { flexGrow: 1 },
  stateContent: { flexGrow: 1, padding: tokens.spacing.lg },
  stage: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.section,
    paddingVertical: tokens.spacing.xl,
  },
  card: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    overflow: "hidden",
  },
  mediaInset: {
    paddingTop: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.xl,
    alignItems: "center",
  },
  media: { width: "100%", maxWidth: 280, height: 140 },
  placeholder: {
    width: "100%",
    maxWidth: 280,
    minHeight: 140,
    justifyContent: "center",
    borderWidth: tokens.borderWidth,
    borderStyle: "dashed",
    borderRadius: tokens.radius.control,
    padding: tokens.spacing.sm,
  },
  copy: { ...tokens.typography.body, lineHeight: 21 },
  heading: {
    ...tokens.typography.heading,
    fontSize: 36,
    lineHeight: 39,
    letterSpacing: -1.8,
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: 18,
  },
  updateHeading: { fontSize: 44, lineHeight: 46, letterSpacing: -2.2 },
  message: {
    ...tokens.typography.body,
    lineHeight: 21,
    padding: tokens.spacing.xl,
    paddingTop: tokens.spacing.md,
  },
  actions: {
    paddingHorizontal: tokens.spacing.section,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.compact,
  },
  operator: {
    minHeight: tokens.size.control,
    alignItems: "center",
    justifyContent: "center",
  },
});
