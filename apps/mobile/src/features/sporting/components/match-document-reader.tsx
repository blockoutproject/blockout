import { useLayoutEffect, useState, useEffectEvent } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import Pdf from "react-native-pdf";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Flag, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import type { File } from "expo-file-system";
import type { MatchDocumentKindEnum } from "../../../../.generated/schemas/index.zod";
import { useAccountSession } from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { supportHref } from "../../support";
import { ApiError } from "../../../shared/api/api-fetch";
import { Page } from "../../../shared/components/page";
import { ScreenState } from "../../../shared/components/screen-state";
import { ErrorState } from "../../../shared/components/state-card";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { IconButton } from "../../../shared/components/icon-button";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import {
  downloadMatchDocument,
  matchDocumentLabels,
  releaseMatchDocument,
} from "../api/match-document";

/** One explicit opening of an eligible match document; closing preserves the underlying match. */
export interface MatchDocumentReaderProps {
  matchId: string;
  kind: MatchDocumentKindEnum;
  onClose(): void;
}

/** Full-screen local-file reading; the file owner keeps Retry feedback through download and native decoding. */
export function MatchDocumentReader({
  matchId,
  kind,
  onClose,
}: Readonly<MatchDocumentReaderProps>) {
  const admission = useOrdinaryRequest();
  const [openingBypass] = useState(admission.bypass);
  const current = admission.admitted && openingBypass === admission.bypass;
  useLayoutEffect(() => {
    if (!current) {
      onClose();
    }
  }, [current, onClose]);
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Modal visible presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
        <Page accessibilityViewIsModal>
          <View style={styles.header}>
            <IconButton label="Fermer le document" onPress={onClose}>
              <X
                accessible={false}
                size={tokens.size.icon.lg}
                color={colors.icon}
              />
            </IconButton>
            <Text
              accessibilityRole="header"
              accessibilityLabel={matchDocumentLabels[kind]}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.title, { color: colors.text }]}
            >
              {matchDocumentLabels[kind]}
            </Text>
            <IconButton
              label="Signaler un problème avec le document"
              onPress={() => {
                onClose();
                router.push(
                  supportHref({
                    screen: "match",
                    targetType: "match",
                    targetId: matchId,
                  }),
                );
              }}
            >
              <Flag
                accessible={false}
                size={tokens.size.icon.lg}
                color={colors.icon}
              />
            </IconButton>
          </View>
          <SafeAreaView edges={["bottom"]} style={styles.pdf}>
            {current && (
              <DocumentAttempt
                key={`${matchId}:${kind}`}
                matchId={matchId}
                kind={kind}
              />
            )}
          </SafeAreaView>
        </Page>
      </SafeAreaProvider>
    </Modal>
  );
}

/** Owns cancellable file attempts and decoding; Retry retains its card until the native reader completes. */
function DocumentAttempt({
  matchId,
  kind,
}: Readonly<Omit<MatchDocumentReaderProps, "onClose">>) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    file?: File;
    status: "loading" | "failed" | "ready";
  }>({
    status: "loading",
  });
  const { colors } = useTheme();
  /** Captures only the current admission/credentials for this native attempt, without restarting it on rerenders. */
  const request = useEffectEvent(async (signal: AbortSignal) => {
    if (!admission.admitted) {
      throw new ApiError("http", 403);
    }
    const credentials = admission.bypass
      ? await session.getCredentials()
      : undefined;
    signal.throwIfAborted();
    if (admission.bypass && !credentials) {
      throw new ApiError("http", 401);
    }
    return admission.request({
      signal,
      headers: credentials
        ? { Authorization: `Bearer ${credentials.accessToken}` }
        : undefined,
    });
  });
  useLayoutEffect(() => {
    const controller = new AbortController();
    let file: File | undefined;

    /** Ordinary public reads never request credentials; bypass uses the captured principal once. */
    async function open() {
      try {
        file = await downloadMatchDocument(
          matchId,
          kind,
          await request(controller.signal),
        );
        if (controller.signal.aborted) {
          releaseMatchDocument(file);
        } else {
          setState({ file, status: "loading" });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: "failed" });
        }
      }
    }

    void open();
    return () => {
      controller.abort();
      if (file) {
        releaseMatchDocument(file);
      }
    };
  }, [matchId, kind, attempt]);
  const retrying = attempt > 0 && state.status === "loading";
  const showError = state.status === "failed" || retrying;
  return (
    <View style={styles.pdf}>
      {state.file && (
        <View
          style={[styles.pdf, showError && styles.hiddenReader]}
          pointerEvents={showError ? "none" : "auto"}
          accessibilityElementsHidden={showError}
          importantForAccessibility={showError ? "no-hide-descendants" : "auto"}
        >
          <Pdf
            key={state.file.uri}
            style={[styles.pdf, { backgroundColor: colors.canvas }]}
            source={{ uri: state.file.uri }}
            renderActivityIndicator={() =>
              showError ? <></> : <DocumentLoading />
            }
            onLoadComplete={() =>
              setState((current) => ({ ...current, status: "ready" }))
            }
            onError={() => {
              if (state.file) {
                releaseMatchDocument(state.file);
              }
              setState({ status: "failed" });
            }}
          />
        </View>
      )}
      {showError ? (
        <ScrollView
          {...hiddenScrollIndicators}
          style={styles.stateOverlay}
          contentContainerStyle={styles.stateContent}
        >
          <ScreenState>
            <ErrorState
              retrying={retrying}
              onRetry={() => {
                setState({ status: "loading" });
                setAttempt((value) => value + 1);
              }}
            />
          </ScreenState>
        </ScrollView>
      ) : (
        !state.file && <DocumentLoading />
      )}
    </View>
  );
}

/** Both the owned download and the PDF peer's supported pending slot reserve the actual document viewport. */
function DocumentLoading() {
  return (
    <LoadingGroup label="Chargement du document" style={styles.loading}>
      <Skeleton height="100%" shape="rectangle" />
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.lg,
    minHeight: tokens.layout.header,
  },
  title: { ...tokens.typography.navigation, flex: 1, textAlign: "center" },
  pdf: { flex: 1 },
  hiddenReader: { opacity: 0 },
  stateOverlay: StyleSheet.absoluteFill,
  stateContent: { flexGrow: 1 },
  loading: { flex: 1, width: "100%", padding: tokens.spacing.screen },
});
