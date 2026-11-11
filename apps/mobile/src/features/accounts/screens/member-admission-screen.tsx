import {
  useGlobalSearchParams,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import { StyleSheet } from "react-native";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { BrandHeader } from "../../../shared/components/brand-header";
import { Button } from "../../../shared/components/button";
import { Page, PageScrollView } from "../../../shared/components/page";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { ErrorState } from "../../../shared/components/state-card";
import {
  useAccountAvailability,
  useEstablishAccount,
} from "../api/use-current-account";
import { PublicAccountLinks } from "../components/public-account-links";
import { useGuestNavigation } from "../hooks/use-guest-navigation";
import { isAccountMissing } from "../api/current-account-query";

/**
 * Presents first member waiting/recovery after public admission; the root owns route admission.
 * Reads never establish an account or start hosted login. Explicit establishment retains the
 * requested route, and guest departure uses the existing native credential-cleanup owner.
 */
export function MemberAdmissionScreen() {
  const { session, account, refusal } = useAccountAvailability();
  const establishment = useEstablishAccount();
  const guest = useGuestNavigation();
  const feedback = useActionFeedback();
  const router = useRouter();
  const returnTo = requestedDestination(
    usePathname(),
    useSegments(),
    useGlobalSearchParams(),
  );
  const waiting =
    session.status === "restoring" ||
    session.status === "authenticating" ||
    (account.isEnabled &&
      account.isLoading &&
      account.errorUpdatedAt === 0 &&
      !establishment.isPending);
  const missing =
    (session.subject !== null && isAccountMissing(refusal)) ||
    establishment.isPending;
  const reauthentication = session.status === "reauthentication-required";
  const primaryPending = establishment.isPending || account.isFetching;
  let label = "Réessayer";
  let description = "Réessayez ou continuez en invité.";
  if (missing) {
    label = "Créer mon compte";
    description = "Créez votre compte ou continuez en invité.";
  } else if (reauthentication) {
    label = "Se connecter";
    description = "Connectez-vous ou continuez en invité.";
  }

  /** Runs only the displayed explicit intent, retaining read errors locally and reporting failed writes once. */
  async function recover() {
    if (session.operation || primaryPending) {
      return;
    }
    if (session.status === "initialization-error") {
      session.retryInitialization();
    } else if (session.status === "authentication-error") {
      session.retryAuthentication();
    } else if (reauthentication) {
      router.push({ pathname: "/sign-in", params: { returnTo } });
    } else if (
      missing &&
      session.status === "authenticated" &&
      session.subject
    ) {
      feedback.clear();
      try {
        await establishment.mutateAsync({
          subject: session.subject,
          getCredentials: session.getCredentials,
        });
      } catch {
        feedback.error();
      }
    } else {
      void account.refetch();
    }
  }

  return (
    <Page header={<BrandHeader />}>
      <PageScrollView>
        <ScreenState style={waiting ? undefined : styles.recovery}>
          {waiting ? (
            <RequestLoading />
          ) : (
            <>
              <ErrorState
                title="Impossible de charger votre compte"
                description={description}
              >
                <Button
                  label={label}
                  onPress={() => void recover()}
                  loading={primaryPending}
                  disabled={guest.pending}
                />
              </ErrorState>
              <Button
                label="Continuer en tant qu’invité"
                variant="secondary"
                fullWidth
                onPress={() => void guest.continueAsGuest()}
                loading={guest.pending}
                disabled={establishment.isPending}
              />
              <PublicAccountLinks supportOrigin={{ screen: "sign-in" }} />
            </>
          )}
        </ScreenState>
      </PageScrollView>
    </Page>
  );
}

/** Preserves the global destination before its child navigator mounts, without duplicating path parameters in the query. */
function requestedDestination(
  pathname: string,
  segments: readonly string[],
  params: Record<string, string | string[]>,
) {
  const pathParameters = new Set(
    segments.flatMap((segment) => {
      const match = segment.match(/^\[(?:\.\.\.)?(.+)\]$/);
      return match ? [match[1]] : [];
    }),
  );
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== "#" && !pathParameters.has(key)) {
      for (const entry of Array.isArray(value) ? value : [value]) {
        query.append(key, entry);
      }
    }
  }
  const search = query.toString();
  const fragment = typeof params["#"] === "string" ? params["#"] : "";
  return `${pathname}${search ? `?${search}` : ""}${fragment ? `#${encodeURIComponent(fragment)}` : ""}`;
}

const styles = StyleSheet.create({
  recovery: { justifyContent: "center" },
});
