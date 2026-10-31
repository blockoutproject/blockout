import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigation, usePreventRemove, useRouter } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  eraseAccount,
  getAccount,
  getEraseAccountMutationKey,
} from "../../../../.generated/mobile";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import {
  Page,
  PageContent,
  PageScrollView,
} from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { useCurrentAccount } from "../api/use-current-account";
import { ProfileLoading } from "../components/profile-loading";
import { useAccountSession } from "../session/account-session-provider";

const confirmationSchema = z.object({ confirmed: z.boolean().refine(Boolean) });

/** Ordinary navigation admission; authentication and the current account retain their existing owners. */
export interface EraseAccountScreenProps {
  admitted: boolean;
}

/** Loads the current owner once before mounting its original-account confirmation. */
export function EraseAccountScreen({ admitted }: EraseAccountScreenProps) {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const router = useRouter();
  const [originalAccountId, setOriginalAccountId] = useState<string>();
  // This route's target survives an ordinary current-account refresh, including absence or replacement.
  if (!originalAccountId && account.isSuccess)
    setOriginalAccountId(account.data.accountId);
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title="Supprimer mon compte ?" />}>
        {({ onScroll, headerHeight }) => (
          <PageScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
          >
            {!admitted ? (
              <ScreenState>
                <ErrorState />
              </ScreenState>
            ) : originalAccountId && session.subject ? (
              <ErasureConfirmation
                accountId={originalAccountId}
                disabled={
                  !account.isSuccess ||
                  session.status !== "authenticated" ||
                  session.accountId !== originalAccountId
                }
              />
            ) : session.status === "restoring" ||
              session.status === "authenticating" ||
              session.status === "signing-out" ||
              (session.status === "authenticated" && account.isPending) ? (
              <PageContent>
                <ProfileLoading />
              </PageContent>
            ) : (
              <ScreenState>
                <ErrorState
                  onRetry={
                    session.status === "initialization-error"
                      ? session.retryInitialization
                      : session.status === "authentication-error"
                        ? session.retryAuthentication
                        : session.status !== "authenticated" ||
                            (account.error instanceof ApiError &&
                              account.error.status === 404)
                          ? () => router.replace("/sign-in")
                          : () => void account.refetch()
                  }
                  retrying={account.isFetching}
                />
              </ScreenState>
            )}
          </PageScrollView>
        )}
      </ScrollChrome>
    </Page>
  );
}

/** Captures the original UUID for this route; recovery never substitutes a refreshed current-account mapping. */
function ErasureConfirmation({
  accountId,
  disabled,
}: {
  accountId: string;
  disabled: boolean;
}) {
  const [needsVerification, setNeedsVerification] = useState(false);
  const [deleted, setDeleted] = useState(false);
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

  /** Clears through the existing native action independently of browser/provider logout; failures permit local retry. */
  async function leaveLocally() {
    await session.clearCredentials();
    if (active.current) disablePrevention();
    router.replace("/");
  }

  const command = useMutation({
    mutationKey: [...getEraseAccountMutationKey(), accountId],
    retry: false,
    networkMode: "always",
    mutationFn: async (action: "erase" | "verify" | "leave") => {
      if (action === "leave") {
        await leaveLocally();
        return;
      }
      const credentials = await session.getCredentials();
      const options = request({
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      /** Only original-resource absence confirms removal; a mismatched successful response remains unavailable. */
      async function readOriginal() {
        try {
          const original = await getAccount(accountId, options);
          if (original.accountId !== accountId) throw new ApiError("schema");
          return false;
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) return true;
          throw error;
        }
      }

      let absent: boolean;
      if (action === "verify") absent = await readOriginal();
      else {
        if (session.accountId !== accountId) throw new ApiError("cancelled");
        try {
          await eraseAccount(accountId, options);
          absent = true;
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) absent = true;
          else {
            if (!isUncertainMutationFailure(error)) throw error;
            if (active.current) setNeedsVerification(true);
            absent = await readOriginal();
          }
        }
      }
      if (active.current) setNeedsVerification(false);
      if (absent) {
        if (active.current) setDeleted(true);
        await leaveLocally();
      } else if (active.current) feedback.error();
    },
    onError: () => {
      if (active.current) feedback.error();
    },
  });
  // Confirmed removal keeps local departure mandatory, including an explicit retry after native storage failure.
  const disablePrevention = usePreventRemove(
    command.isPending || deleted,
    () => {},
  );
  const busy = command.isPending;
  const unavailable = disabled || session.accountId !== accountId;

  /** One explicit event owns each command; Query never retries or replays a destructive write. */
  function run(action: "erase" | "verify" | "leave") {
    feedback.clear();
    command.mutate(action);
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
              disabled: busy || deleted || unavailable,
            }}
            disabled={busy || deleted || unavailable}
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
      {!deleted && (
        <Button
          label={
            needsVerification
              ? "Vérifier la suppression"
              : "Supprimer mon compte"
          }
          variant={needsVerification ? "secondary" : "destructive"}
          fullWidth
          loading={busy && command.variables !== "leave"}
          disabled={busy || (!needsVerification && (!confirmed || unavailable))}
          onPress={
            needsVerification
              ? () => run("verify")
              : () => void handleSubmit(() => run("erase"))()
          }
        />
      )}
      {(needsVerification || deleted) && (
        <Button
          label="Continuer en tant qu’invité"
          variant="secondary"
          fullWidth
          loading={busy && command.variables === "leave"}
          disabled={busy}
          onPress={() => run("leave")}
        />
      )}
      {!deleted && (
        <Button
          label="Annuler"
          variant="secondary"
          fullWidth
          disabled={busy}
          onPress={() => navigation.goBack()}
        />
      )}
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
