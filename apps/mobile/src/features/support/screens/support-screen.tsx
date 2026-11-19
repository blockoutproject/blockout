import { homeHref } from "@/shared/native/home-href";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { Text } from "react-native";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";

import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Surface } from "@/shared/components/surface";
import { IconButton } from "@/shared/components/icon-button";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { SupportForm } from "../forms/support-form";
import { useSupportVisit } from "../forms/support-visit";
import { SupportConfirmation } from "../forms/support-confirmation";
import { useSupportSubmission } from "../api/use-support-submission";

/** Keeps support context and its retained form below ordinary navigation; Page and FormScrollView own native insets and keyboard scrolling. */
export function SupportScreen() {
  const { context } = useSupportVisit();
  const { colors } = useTheme();
  const { mutation, send } = useSupportSubmission();
  return (
    <Page header={<SupportHeader />}>
      <FormScrollView>
        <PageContent reveal={!mutation.isSuccess}>
          {!mutation.isSuccess && context.screen && (
            <Surface>
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                DEPUIS CET ÉCRAN
              </Text>
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                {context.screen}
              </Text>
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                Le contexte de cet écran accompagne votre demande.
              </Text>
            </Surface>
          )}
          {mutation.isSuccess ? (
            <SupportConfirmation />
          ) : (
            <SupportForm onSubmit={send} />
          )}
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

function SupportHeader() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <PageHeader
      title="Assistance et suggestions"
      back={false}
      action={
        <IconButton
          label="Fermer"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace(homeHref)
          }
        >
          <X
            accessible={false}
            size={tokens.size.icon.lg}
            color={colors.icon}
          />
        </IconButton>
      }
    />
  );
}
