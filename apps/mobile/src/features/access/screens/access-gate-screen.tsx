import { AccessCelebration } from "@/shared/components/access-celebration";
import {
  AccessFrame,
  AccessStageCard,
  AccessStageScrollView,
} from "@/shared/components/access-frame";
import { BrandHeader } from "@/shared/components/brand-header";
import { Button } from "@/shared/components/button";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { IconButton } from "@/shared/components/icon-button";
import { PageViewport } from "@/shared/components/navigation-backdrop";
import { Page, PageScrollView } from "@/shared/components/page";
import {
  hasReadError,
  ReadFeedback,
  type ReadFeedbackQuery,
} from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowDownToLine, X } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PublicMaintenanceResponse } from "../../../../.generated/schemas/index.zod";
import { applicationUpdateMessage } from "../application-update-message";
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
  query?: ReadFeedbackQuery;
  onRefresh?: () => Promise<unknown>;
  onAdministration?: () => void;
  /** Local presentation only; closing a preview never changes admission. */
  onClose?: () => void;
}

function GateView({
  gate,
  maintenance,
  updateMessage,
  storeUrl,
  query,
  onRefresh,
  onAdministration,
  onClose,
}: Readonly<GateViewProps>) {
  const { colors } = useTheme();
  if (gate === "unavailable" || (query && hasReadError(query))) {
    return (
      <Page fullBleed>
        <PageViewport
          header={<BrandHeader />}
          headerMinHeight={tokens.layout.brandHeader}
        >
          <PageScrollView>
            <ScreenState>
              {query && (
                <ReadFeedback query={query} loadingContent={null} failed />
              )}
            </ScreenState>
          </PageScrollView>
        </PageViewport>
      </Page>
    );
  }
  if (gate === "checking") {
    return null;
  }

  const update = gate === "update";
  const image = maintenance?.imageUrl;
  const title = update
    ? "Mets Blockout à jour."
    : "Blockout est en maintenance";
  const message = update
    ? (updateMessage ?? applicationUpdateMessage)
    : maintenance?.message;
  let storeAction: ReactNode;
  if (update && storeUrl) {
    storeAction = <StoreAction url={storeUrl} />;
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

  return (
    <AccessFrame
      headerAction={
        onClose && (
          <View style={styles.headerActions}>
            <Text
              style={[
                styles.badge,
                { color: colors.text, borderColor: colors.border },
              ]}
            >
              APERÇU
            </Text>
            <IconButton label="Fermer" onPress={onClose}>
              <X
                accessible={false}
                size={tokens.size.icon.lg}
                color={colors.icon}
              />
            </IconButton>
          </View>
        )
      }
      footer={
        !update &&
        onAdministration && (
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
        )
      }
    >
      <AccessStageScrollView
        refreshControl={
          !onClose && query && onRefresh ? (
            <DataRefreshControl
              onRefresh={onRefresh}
              fetching={query.isFetching}
            />
          ) : undefined
        }
      >
        <AccessStageCard>
          {update ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.topic, { backgroundColor: colors.subtle }]}
            >
              <ArrowDownToLine
                accessible={false}
                size={tokens.size.icon.lg}
                color={colors.icon}
              />
            </View>
          ) : (
            <GateImage key={image ?? "placeholder"} uri={image} />
          )}
          <Text
            accessibilityRole="header"
            style={[tokens.typography.headingXl, { color: colors.text }]}
          >
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.secondaryText }]}>
            {message}
          </Text>
          {storeAction}
        </AccessStageCard>
      </AccessStageScrollView>
    </AccessFrame>
  );
}

/** Native decode feedback belongs to one mounted illustration and is discarded when its URI changes. */
function GateImage({ uri }: Readonly<{ uri?: string | null }>) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return uri && !failed ? (
    <Image
      source={{ uri }}
      accessible={false}
      contentFit="contain"
      style={[styles.media, { backgroundColor: colors.mediaPlaceholder }]}
      onError={() => setFailed(true)}
    />
  ) : (
    <AccessCelebration />
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
      query={access.query}
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
      query={access.query}
      onRefresh={access.retry}
      onAdministration={
        access.operations ? () => router.push("/administration") : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
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
  topic: {
    width: tokens.size.media.entity,
    height: tokens.size.media.entity,
    borderRadius: tokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  media: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 280,
    aspectRatio: 3 / 2,
    borderRadius: tokens.radius.panelInset,
  },
  message: {
    ...tokens.typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  operator: {
    minHeight: tokens.size.control.default,
    alignItems: "center",
    justifyContent: "center",
  },
});
