import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { isAccountMissing } from "../api/current-account-query";
import { useEstablishAccount } from "../api/use-current-account";
import { useAccountSession } from "../session/account-session-provider";
import { SignInInvitationCard } from "./sign-in-invitation";

/** The caller retains its Query/read feedback; only confirmed absence or native reauthentication changes the action. */
export interface AccountRecoveryProps {
  error: unknown;
  children: ReactNode;
}

/** Reuses the existing invitation without starting authentication or establishing an account from a read. */
export function AccountRecovery({
  error,
  children,
}: Readonly<AccountRecoveryProps>) {
  const session = useAccountSession();
  const router = useRouter();
  if (session.status === "reauthentication-required") {
    return (
      <SignInInvitationCard
        message="Vos équipes, à vos côtés."
        onSignIn={() => router.push("/sign-in")}
      />
    );
  }
  if (
    session.status === "authenticated" &&
    session.subject &&
    isAccountMissing(error)
  ) {
    return <MissingAccount />;
  }
  return children;
}

/** The mounted original principal owns this explicit write and its ordinary failure feedback. */
function MissingAccount() {
  const session = useAccountSession();
  const establishment = useEstablishAccount();
  const feedback = useActionFeedback();
  const { colors } = useTheme();

  async function createAccount() {
    if (
      session.status !== "authenticated" ||
      !session.subject ||
      establishment.isPending
    ) {
      return;
    }
    feedback.clear();
    try {
      await establishment.mutateAsync({
        subject: session.subject,
        getCredentials: session.getCredentials,
      });
    } catch {
      feedback.error();
    }
  }

  return (
    <SignInInvitationCard
      message="Votre compte n’est pas disponible."
      label="Créer mon compte"
      loading={establishment.isPending}
      onSignIn={() => void createAccount()}
    >
      <Text style={[tokens.typography.body, { color: colors.secondaryText }]}>
        Créez votre compte pour retrouver les fonctions personnelles. La
        consultation reste accessible.
      </Text>
    </SignInInvitationCard>
  );
}
