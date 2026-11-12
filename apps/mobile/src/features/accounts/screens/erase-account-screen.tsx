import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigation, usePreventRemove, useRouter } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, LogIn } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  eraseAccount,
  getEraseAccountMutationKey,
} from "../../../../.generated/mobile";
import { ApiError } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import {
  Page,
  PageContent,
  PageScrollView,
} from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";

import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import {
  hasReadError,
  ReadFeedback,
} from "../../../shared/components/read-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { useCurrentAccount } from "../api/use-current-account";
import { isAccountMissing } from "../api/current-account-query";
import { accountSessionRecovery } from "../session/account-session-recovery";
import { useAccountSession } from "../session/account-session-provider";

const confirmationSchema = z.object({ confirmed: z.boolean().refine(Boolean) });

/** Ordinary navigation admission; authentication and the current account retain their existing owners. */
export interface EraseAccountScreenProps {
  admitted: boolean;
}

/** Loads the current owner once before mounting its original-account confirmation. */
export function EraseAccountScreen({
  admitted,
}: Readonly<EraseAccountScreenProps>) {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const router = useRouter();
  const [originalAccountId, setOriginalAccountId] = useState<string>();
  const needsSignIn =
    session.status !== "initialization-error" &&
    session.status !== "authentication-error" &&
    (session.status !== "authenticated" || isAccountMissing(account.error));
  // This route's target survives an ordinary current-account refresh, including absence or replacement.
  if (!originalAccountId && account.isSuccess && account.data) {
    setOriginalAccountId(account.data.accountId);
  }
  const recovery = accountSessionRecovery(session);

  /** Uses the shared read card and preserves the native session's own sign-in/recovery actions. */
  function readFeedback() {
    if (!admitted) {
      return (
        <ScreenState>
          <ErrorState />
        </ScreenState>
      );
    }
    if (recovery.pending) {
      return (
        <PageContent>
          <ErasureLoading />
        </PageContent>
      );
    }
    if (!recovery.failed && !needsSignIn) {
      const feedback = (
        <ReadFeedback
          query={account}
          loadingContent={
            <PageContent>
              <ErasureLoading />
            </PageContent>
          }
        />
      );
      return hasReadError(account) ? (
        <ScreenState>{feedback}</ScreenState>
      ) : (
        feedback
      );
    }
    return (
      <ScreenState>
        <ErrorState onRetry={recovery.onRetry}>
          {needsSignIn && (
            <Button
              label="Se connecter"
              leadingIcon={LogIn}
              onPress={() => router.replace("/sign-in")}
            />
          )}
        </ErrorState>
      </ScreenState>
    );
  }

  return (
    <Page header={<PageHeader title="Supprimer mon compte ?" />}>
      <PageScrollView>
        {admitted && originalAccountId && session.subject ? (
          <ErasureConfirmation
            accountId={originalAccountId}
            disabled={
              !account.isSuccess ||
              session.status !== "authenticated" ||
              session.accountId !== originalAccountId
            }
            readFeedback={
              hasReadError(account) || recovery.failed
                ? readFeedback()
                : undefined
            }
          />
        ) : (
          readFeedback()
        )}
      </PageScrollView>
    </Page>
  );
}

/** Reserves the existing warning, confirmation and action without exposing a destructive control before account admission. */
function ErasureLoading() {
  return (
    <LoadingGroup
      label="Chargement de la suppression du compte"
      style={styles.content}
    >
      <Skeleton />
      <Skeleton width="75%" />
      <Skeleton />
      <Skeleton width="85%" />
      <View style={styles.confirmation}>
        <Skeleton
          width={tokens.size.icon.md}
          height={tokens.size.icon.md}
          shape="rectangle"
        />
        <Skeleton width="75%" />
      </View>
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
    </LoadingGroup>
  );
}

/** Keeps this route's original UUID and RHF confirmation mounted behind read feedback; failed commands permit an explicit new attempt. */
function ErasureConfirmation({
  accountId,
  disabled,
  readFeedback,
}: Readonly<{
  accountId: string;
  disabled: boolean;
  readFeedback?: ReactNode;
}>) {
  const session = useAccountSession();
  const { request } = useOrdinaryRequest();
  const feedback = useActionFeedback();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(confirmationSchema),
    defaultValues: { confirmed: false },
  });
  const confirmed = useWatch({ control, name: "confirmed" });

  const command = useMutation({
    mutationKey: [...getEraseAccountMutationKey(), accountId],
    retry: false,
    networkMode: "always",
    mutationFn: async () => {
      if (session.accountId !== accountId) {
        throw new ApiError("cancelled");
      }
      const credentials = await session.getCredentials();
      await eraseAccount(
        accountId,
        request({
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        }),
      );
      await session.clearCredentials();
      if (active.current) {
        disablePrevention();
      }
      router.replace("/");
    },
    onError: () => {
      if (active.current) {
        feedback.error();
      }
    },
  });
  const disablePrevention = usePreventRemove(command.isPending, () => {});
  const busy = command.isPending;
  const unavailable = disabled || session.accountId !== accountId;

  /** One explicit event owns each command; Query never retries or replays a destructive write. */
  function run() {
    feedback.clear();
    command.mutate();
  }

  if (readFeedback) {
    return readFeedback;
  }

  return (
    <PageContent style={styles.content}>
      <Text style={[styles.body, { color: colors.text }]}>
        Votre compte et vos données seront supprimés définitivement.
      </Text>
      <Text style={[styles.body, { color: colors.text }]}>
        Supprimer le compte ne résilie pas votre abonnement Pro : gérez-le dans
        l’App Store ou Google Play.
      </Text>
      <Controller
        control={control}
        name="confirmed"
        render={({ field }) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="Je confirme la suppression de mon compte."
            accessibilityState={{
              checked: field.value,
              disabled: busy || unavailable,
            }}
            disabled={busy || unavailable}
            onPress={() => field.onChange(!field.value)}
            style={styles.confirmation}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.secondaryText,
                },
              ]}
            >
              {field.value && (
                <Check
                  accessible={false}
                  size={tokens.size.icon.md}
                  color={colors.icon}
                />
              )}
            </View>
            <Text style={[styles.label, { color: colors.text }]}>
              Je confirme la suppression de mon compte.
            </Text>
          </Pressable>
        )}
      />
      <Button
        label="Supprimer mon compte"
        variant="destructive"
        fullWidth
        loading={busy}
        disabled={busy || !confirmed || unavailable}
        onPress={() => void handleSubmit(run)()}
      />
      <Button
        label="Annuler"
        variant="secondary"
        fullWidth
        disabled={busy}
        onPress={() => navigation.goBack()}
      />
    </PageContent>
  );
}

const styles = StyleSheet.create({
  content: { gap: tokens.spacing.md },
  body: { ...tokens.typography.body },
  confirmation: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacing.md,
    minHeight: tokens.size.control.default,
    paddingVertical: tokens.spacing.md,
  },
  checkbox: {
    width: tokens.size.icon.md,
    height: tokens.size.icon.md,
    borderWidth: tokens.border.subtle,
    borderRadius: tokens.radius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...tokens.typography.body, flex: 1 },
});
