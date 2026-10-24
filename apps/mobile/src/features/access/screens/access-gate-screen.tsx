import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { RotateCw } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Image as SvgImage, Mask, Rect } from "react-native-svg";
import { Button } from "../../../shared/components/button";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { GateBackdrop } from "../components/gate-backdrop";
import { StoreAction } from "../components/store-action";
import { useAccessAdmission } from "../queries/use-access-admission";
import { useApplicationAccess } from "../queries/use-application-access";
import { accessPresentation } from "../state/access-presentation";
import type { AccessSnapshot } from "../state/access-observations";

/** Presentation of the current restriction; retry and operator entry remain explicit owner commands. */
interface GateViewProps {
  snapshot: AccessSnapshot;
  presentation: ReturnType<typeof accessPresentation>;
  checking: boolean;
  onRetry(): void;
  onAdministration?: () => void;
}

/** Full-width stage centers its content and decorative rails together; only foreground controls own side margins. */
function GateView({
  snapshot,
  presentation,
  checking,
  onRetry,
  onAdministration,
}: GateViewProps) {
  const { colors } = useTheme();
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const { gate, versions } = presentation;
  const update = gate === "update";
  const maintenance = gate === "maintenance";
  const image = maintenance ? snapshot.maintenance?.imageUrl : null;
  let title = "Accès indisponible.";
  let badge = "INDISPONIBLE";
  let message: string | null | undefined =
    "Petit temps mort pour Blockout. Réessaie dans quelques instants.";
  if (maintenance) {
    title = "Blockout est en maintenance";
    badge = "MAINTENANCE";
    message = snapshot.maintenance?.message;
  } else if (update) {
    title = "Mets Blockout\nà jour.";
    badge = "MISE À JOUR";
    message =
      snapshot.versions?.message ??
      "Une nouvelle version de Blockout est obligatoire pour continuer à utiliser l’application.";
  }
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <View style={styles.identity}>
          <Svg width={28} height={28} accessible={false}>
            <Defs>
              <Mask id="brand" maskType="luminance">
                <SvgImage
                  href={require("../../../../assets/access/brand-mark.png")}
                  width={28}
                  height={28}
                />
              </Mask>
            </Defs>
            <Rect
              width={28}
              height={28}
              fill={colors.text}
              mask="url(#brand)"
            />
          </Svg>
          <Text style={[styles.brand, { color: colors.text }]}>BLOCKOUT</Text>
        </View>
        <Text
          style={[
            styles.badge,
            { color: colors.text, borderColor: colors.border },
          ]}
        >
          {badge}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.stage}>
          <GateBackdrop />
          {gate === "checking" ? (
            <RequestLoading />
          ) : (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {!update && (
                <View style={styles.mediaInset}>
                  {image && image !== failedImage ? (
                    <Image
                      key={image}
                      source={{ uri: image }}
                      contentFit="contain"
                      accessible={false}
                      style={styles.media}
                      onError={() => setFailedImage(image)}
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
                  )}
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
          )}
        </View>
        <View style={styles.actions}>
          {update && versions?.storeUrl ? (
            <StoreAction key={versions.storeUrl} url={versions.storeUrl} />
          ) : (
            <Button
              fullWidth
              label="Réessayer"
              trailingIcon={RotateCw}
              loading={checking}
              onPress={onRetry}
            />
          )}
          {maintenance && onAdministration && (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Accès administrateur"
              onPress={onAdministration}
              style={styles.operator}
            >
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                Accès administrateur
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Displays public results even while first-install credential initialization has not mounted Auth0. */
export function StartupAccessGate() {
  const access = useApplicationAccess();
  const presentation = accessPresentation(access.snapshot);
  return (
    <GateView
      snapshot={access.snapshot}
      presentation={{
        ...presentation,
        gate: presentation.ordinary ? "checking" : presentation.gate,
      }}
      checking={access.checking}
      onRetry={() => void access.retry()}
    />
  );
}

/** Renders the current blocking state; its only in-app destination is current authorized operations. */
export function AccessGateScreen() {
  const access = useAccessAdmission();
  const router = useRouter();
  return (
    <GateView
      snapshot={access.snapshot}
      presentation={access}
      checking={access.checking}
      onRetry={access.retry}
      onAdministration={
        access.operations ? () => router.push("/administration") : undefined
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
  brand: { ...tokens.typography.heading, fontSize: 16, lineHeight: 22 },
  badge: {
    ...tokens.typography.metadata,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.badge,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  scroll: { flexGrow: 1 },
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
