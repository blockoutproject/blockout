import { Page, PageScrollView, PageContent } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";
import { applicationUpdateMessage } from "../application-update-message";
import { RoundedContainedImage } from "@/shared/components/rounded-contained-image";
import { ImageFallback } from "@/shared/components/image-fallback";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PublicMaintenanceResponse } from "../../../../.generated/schemas/index.zod";
import { IconButton } from "@/shared/components/icon-button";
import { Button } from "@/shared/components/button";
import { BrandHeader } from "@/shared/components/brand-header";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import { ScreenState } from "@/shared/components/screen-state";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
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
  onRefresh?: () => Promise<unknown>;
  onAdministration?: () => void;
  /** Local presentation only; closing a preview never changes admission. */
  onClose?: () => void;
}

/** Admission feedback retains its domain stage and responsive actions; the one-line brand keeps its complete accessible name. */
function GateView({
  gate,
  maintenance,
  updateMessage,
  storeUrl,
  checking = false,
  onRefresh,
  onAdministration,
  onClose,
}: Readonly<GateViewProps>) {
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
  let storeAction: ReactNode = null;
  if (update && storeUrl) {
    storeAction = <StoreAction key={storeUrl} url={storeUrl} />;
  } else if (update && onClose) {
    storeAction = (
      <Button
        fullWidth
        label="Mettre à jour l’application"
        onPress={undefined}
        disabled
      />
    );
  }

  /** Keeps pending/unavailable recovery distinct from maintenance and update presentation. */
  function renderContent() {
    if (gate === "checking") {
      return (
        <PageContent>
          <LoadingGroup label="Vérification de l’accès" style={styles.pending}>
            <Skeleton width="62%" height={tokens.typography.title.lineHeight} />
            <Skeleton width="90%" />
            <Skeleton width="72%" />
          </LoadingGroup>
        </PageContent>
      );
    }
    if (simple) {
      return (
        <ScreenState>
          <ErrorState onRetry={onRefresh} retrying={checking} />
        </ScreenState>
      );
    }
    return (
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
          {storeAction}
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
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                Accès administrateur
              </Text>
            </Pressable>
          )}
        </View>
      </>
    );
  }

  return (
    <Page
      header={
        <BrandHeader>
          <View style={styles.headerActions}>
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
                  size={tokens.size.icon.lg}
                  color={colors.icon}
                />
              </IconButton>
            )}
          </View>
        </BrandHeader>
      }
    >
      <PageScrollView
        refreshControl={
          !onClose && onRefresh && !simple ? (
            <DataRefreshControl onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {renderContent()}
      </PageScrollView>
    </Page>
  );
}

/** Native decode feedback belongs to one mounted illustration and is discarded when its URI changes. */
function GateImage({ uri }: Readonly<{ uri?: string | null }>) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return uri && !failed ? (
    <RoundedContainedImage
      source={{ uri }}
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
      <ImageFallback color={colors.secondaryText} />
    </View>
  );
}

/** Previews unsaved copy and the validated current-platform store action without publishing or changing admission. */
export function ApplicationVersionsPreview({
  message,
  storeUrl,
  onClose,
}: Readonly<{
  message: string | null;
  storeUrl: string | null;
  onClose(): void;
}>) {
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
      onRefresh={access.retry}
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
  pending: { gap: tokens.spacing.md },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  badge: {
    ...tokens.typography.metadata,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  stage: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: tokens.spacing["2xl"],
    paddingVertical: tokens.spacing.xl,
  },
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  mediaInset: {
    paddingTop: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.xl,
    alignItems: "center",
  },
  media: {
    width: "100%",
    maxWidth: 280,
    height: 140,
    borderRadius: tokens.media.radius.profile,
  },
  placeholder: {
    alignItems: "center",
    width: "100%",
    maxWidth: 280,
    minHeight: 140,
    justifyContent: "center",
    borderWidth: tokens.border.thin,
    borderStyle: "dashed",
    borderRadius: tokens.media.radius.profile,
    overflow: "hidden",
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
    paddingHorizontal: tokens.spacing["2xl"],
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.compact,
  },
  operator: {
    minHeight: tokens.size.control.default,
    alignItems: "center",
    justifyContent: "center",
  },
});
