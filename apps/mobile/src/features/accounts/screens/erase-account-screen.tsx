import { homeHref } from "@/shared/native/home-href";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation, usePreventRemove, useRouter } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, LogIn } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  eraseAccount,
  getEraseAccountMutationKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "@/shared/api/api-fetch";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { Page, PageContent } from "@/shared/components/page";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { PageHeader } from "@/shared/components/page-header";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";

import { ErrorState } from "@/shared/components/state-card";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import { useCurrentAccount } from "../api/use-current-account";
import { updateCurrentAccount } from "../api/current-account-query";
import { AccountRecovery } from "../components/account-recovery";
import { accountSessionRecovery } from "../session/account-session-recovery";
import { useAccountSession } from "../session/account-session-provider";

const confirmationSchema = z.object({ confirmed: z.boolean().refine(Boolean) });
const currentAccountKey = getGetMyAccountQueryKey();

type ErasureAction = "eraseAccount" | "retryDeparture";

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
    session.status !== "authenticated";
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
        <AccountRecovery error={account.error}>
          <ReadFeedback
            query={account}
            loadingContent={
              <PageContent>
                <ErasureLoading />
              </PageContent>
            }
          />
        </AccountRecovery>
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
      <FormScrollView>
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
      </FormScrollView>
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

/** Keeps the original confirmation mounted and remembers a 204 for the rest of this visit. */
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
  const client = useQueryClient();
  const { colors } = useTheme();
  const [acknowledged, setAcknowledged] = useState(false);
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
    mutationFn: async (action: ErasureAction) => {
      if (action === "eraseAccount") {
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
        setAcknowledged(true);
      }
      const currentAccountId = client.getQueryData<AccountResponse | null>(
        currentAccountKey,
      )?.accountId;
      if (currentAccountId && currentAccountId !== accountId) {
        return;
      }
      await Promise.all([
        action === "eraseAccount"
          ? updateCurrentAccount(client, accountId, () => null)
          : undefined,
        session.clearCredentials({ erasedAccountId: accountId }),
      ]);
      if (active.current) {
        disablePrevention();
      }
      router.replace(homeHref);
    },
    onError: () => feedback.error(),
  });
  const busy = command.isPending;
  const showRetryAction =
    acknowledged && (!busy || command.variables === "retryDeparture");
  const disablePrevention = usePreventRemove(busy);
  const replaced =
    session.accountId !== null && session.accountId !== accountId;
  const unavailable = acknowledged ? replaced || !!session.operation : disabled;
  const confirmationDisabled = busy || unavailable || acknowledged;
  const requiredReadFeedback = acknowledged ? undefined : readFeedback;

  function run(action: ErasureAction) {
    feedback.clear();
    command.mutate(action);
  }

  return (
    <>
      {requiredReadFeedback}
      <PageContent
        style={[
          styles.content,
          requiredReadFeedback ? styles.hidden : undefined,
        ]}
        accessibilityElementsHidden={!!requiredReadFeedback}
        importantForAccessibility={
          requiredReadFeedback ? "no-hide-descendants" : "auto"
        }
      >
        <Text style={[styles.body, { color: colors.text }]}>
          {acknowledged
            ? "Votre compte Blockout a été supprimé."
            : "Votre compte et vos données seront supprimés définitivement."}
        </Text>
        <Text style={[styles.body, { color: colors.text }]}>
          Supprimer le compte ne résilie pas votre abonnement Pro : gérez-le
          dans l’App Store ou Google Play.
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
                disabled: confirmationDisabled,
              }}
              disabled={confirmationDisabled}
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
          label={showRetryAction ? "Réessayer" : "Supprimer mon compte"}
          variant={showRetryAction ? "primary" : "destructive"}
          fullWidth
          loading={busy}
          disabled={busy || unavailable || (!acknowledged && !confirmed)}
          onPress={
            acknowledged
              ? () => run("retryDeparture")
              : () => void handleSubmit(() => run("eraseAccount"))()
          }
        />
        <Button
          label={acknowledged ? "Retour au profil" : "Annuler"}
          variant="secondary"
          fullWidth
          disabled={busy}
          onPress={() => navigation.goBack()}
        />
      </PageContent>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: tokens.spacing.md },
  hidden: { display: "none" },
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
