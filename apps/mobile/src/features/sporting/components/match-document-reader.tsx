import { useLayoutEffect, useState, useEffectEvent } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
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
import { RequestLoading } from "../../../shared/components/request-feedback";
import { IconButton } from "../../../shared/components/icon-button";
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

/** Full-screen native reading of a local file only; retry creates a new cancellable attempt. */
export function MatchDocumentReader({
  matchId,
  kind,
  onClose,
}: MatchDocumentReaderProps) {
  const [attempt, setAttempt] = useState(0);
  const admission = useOrdinaryRequest();
  const [openingBypass] = useState(admission.bypass);
  const current = admission.admitted && openingBypass === admission.bypass;
  useLayoutEffect(() => {
    if (!current) onClose();
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
                key={`${matchId}:${kind}:${attempt}`}
                matchId={matchId}
                kind={kind}
                onRetry={() => setAttempt((value) => value + 1)}
              />
            )}
          </SafeAreaView>
        </Page>
      </SafeAreaProvider>
    </Modal>
  );
}

/** Owns one transport/controller/file lifetime. Identity or admission replacement releases it before paint. */
function DocumentAttempt({
  matchId,
  kind,
  onRetry,
}: Omit<MatchDocumentReaderProps, "onClose"> & { onRetry(): void }) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const [state, setState] = useState<{ file?: File; failed: boolean }>({
    failed: false,
  });
  const { colors } = useTheme();
  /** Captures only the current admission/credentials for this native attempt, without restarting it on rerenders. */
  const request = useEffectEvent(async (signal: AbortSignal) => {
    if (!admission.admitted) throw new ApiError("http", 403);
    const credentials = admission.bypass
      ? await session.getCredentials()
      : undefined;
    signal.throwIfAborted();
    if (admission.bypass && !credentials) throw new ApiError("http", 401);
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
        if (controller.signal.aborted) releaseMatchDocument(file);
        else setState({ file, failed: false });
      } catch {
        if (!controller.signal.aborted) setState({ failed: true });
      }
    }
    void open();
    return () => {
      controller.abort();
      if (file) releaseMatchDocument(file);
    };
  }, [matchId, kind]);
  if (state.failed)
    return (
      <ScreenState>
        <ErrorState onRetry={onRetry} />
      </ScreenState>
    );
  if (!state.file)
    return (
      <ScreenState>
        <RequestLoading />
      </ScreenState>
    );
  return (
    <Pdf
      style={[styles.pdf, { backgroundColor: colors.canvas }]}
      source={{ uri: state.file.uri }}
      onError={() => {
        if (state.file) releaseMatchDocument(state.file);
        setState({ failed: true });
      }}
    />
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
});
