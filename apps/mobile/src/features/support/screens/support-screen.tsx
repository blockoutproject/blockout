import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { Page, PageContent } from "../../../shared/components/page";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { Surface } from "../../../shared/components/surface";
import { IconButton } from "../../../shared/components/icon-button";
import { ApiError } from "../../../shared/api/api-fetch";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { SupportForm } from "../forms/support-form";
import { useSupportVisit } from "../forms/support-visit";

/** Composes the ordinary native form; shared chrome owns measured safe areas, backdrop and keyboard scrolling. */
export function SupportScreen() {
  const { context } = useSupportVisit();
  const { colors } = useTheme();
  return (
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<SupportHeader />}>
        {({ onScroll, headerHeight }) => (
          <FormScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
          >
            <PageContent>
              {context.screen && (
                <Surface>
                  <Text
                    style={[
                      tokens.typography.metadata,
                      { color: colors.secondaryText },
                    ]}
                  >
                    DEPUIS CET ÉCRAN
                  </Text>
                  <Text
                    style={[tokens.typography.strong, { color: colors.text }]}
                  >
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
              <SupportForm onSubmit={unavailableSubmission} />
            </PageContent>
          </FormScrollView>
        )}
      </ScrollChrome>
    </Page>
  );
}

/** Complete sending belongs to T028; this increment performs no provider effect or receipt confirmation. */
async function unavailableSubmission() {
  throw new ApiError("http", 503);
}

/** Preserves the approved left-aligned support title and shared close action; dirty removal uses the form guard. */
function SupportHeader() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        Assistance et suggestions
      </Text>
      <IconButton
        label="Fermer"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      >
        <X accessible={false} size={tokens.size.icon.lg} color={colors.icon} />
      </IconButton>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    minHeight: tokens.layout.header,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
  },
  title: { ...tokens.typography.navigation, flex: 1 },
});
