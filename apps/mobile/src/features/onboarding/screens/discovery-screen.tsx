import { Page, PageScrollView } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ArrowRight, ChevronLeft } from "lucide-react-native";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  type ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BrandHeader } from "../../../shared/components/brand-header";
import { Button } from "../../../shared/components/button";
import { IconButton } from "../../../shared/components/icon-button";

import { ScreenState } from "../../../shared/components/screen-state";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import {
  DiscoveryBackdrop,
  DiscoveryExample,
} from "../components/discovery-artwork";
import { useDiscovery } from "../discovery-provider";

const steps = [
  {
    label: "LA COMMUNAUTÉ VOLLEY",
    title: "Tout le volley.\nDans ta poche.",
    paragraphs: [
      "Calendriers, résultats disponibles et classements : suis tes équipes et tes poules pour retrouver leurs rencontres.",
    ],
  },
  {
    label: "RESTE DANS LE MATCH",
    title: "Le résultat arrive,\ntu le retrouves.",
    paragraphs: [
      "Retrouve les résultats et les liens de diffusion dans Notifications. Les notifications du téléphone restent facultatives.",
    ],
  },
  {
    label: "MIEUX, ENSEMBLE",
    title: "Un score à\nfiabiliser ?",
    paragraphs: [
      "Les données viennent des sources officielles FFVB et LNV selon les compétitions couvertes. Sur la fiche d’un match, touche le drapeau entouré pour signaler un souci.",
    ],
  },
  {
    label: "TRANSPARENCE",
    title: "Une appli faite\npour les passionnés.",
    paragraphs: [
      "Blockout est une application indépendante. Explore les compétitions nationales, régionales et départementales couvertes. Les données manquantes restent indiquées.",
    ],
  },
  {
    label: "C’EST PARTI",
    title: "Trouve ton prochain match.",
    paragraphs: [
      "Commence sans compte, ou connecte-toi pour suivre tes équipes et tes poules.",
      "Déjà sur Blockout ? Reconnecte-toi. Tes anciens suivis, notifications, contributions et personnalisations de profil ne sont pas repris.",
      "Tes droits Pro sont conservés. Si besoin, utilise « Restaurer mes achats » dans l’espace Pro après connexion.",
    ],
  },
];

/** Common discovery with blocking read feedback; only explicit finish/skip persists completion. */
export function DiscoveryScreen() {
  const { colors } = useTheme();
  const discovery = useDiscovery();
  const [step, setStep] = useState(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const heading = useRef<ComponentRef<typeof Text>>(null);
  const content = steps[step];

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (heading.current)
      AccessibilityInfo.sendAccessibilityEvent(heading.current, "focus");
  }, [step]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (step > 0 && !discovery.saving) {
          setStep((value) => value - 1);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [step, discovery.saving]);

  return (
    <Page>
      <BrandHeader>
        {discovery.error !== "read" && step < 4 && (
          <Button
            label="Passer"
            variant="secondary"
            onPress={() => void discovery.finish()}
            loading={discovery.saving}
          />
        )}
      </BrandHeader>
      <PageScrollView ref={scroll}>
        {discovery.error === "read" ? (
          <ScreenState>
            <ErrorState onRetry={discovery.retryRead} />
          </ScreenState>
        ) : (
          <View style={styles.stage}>
            <DiscoveryBackdrop />
            <View style={styles.stack}>
              <DiscoveryExample step={step} />
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[tokens.typography.metadata, { color: colors.text }]}
                >
                  {content.label}
                </Text>
                <Text
                  ref={heading}
                  accessible
                  accessibilityRole="header"
                  style={[styles.title, { color: colors.text }]}
                >
                  {content.title}
                </Text>
                {content.paragraphs.map((paragraph) => (
                  <Text
                    key={paragraph}
                    style={[
                      tokens.typography.body,
                      { color: colors.secondaryText },
                    ]}
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}
      </PageScrollView>
      {discovery.error !== "read" && (
        <View style={styles.footer}>
          <View
            style={[
              styles.previous,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <IconButton
              label="Étape précédente"
              onPress={() => setStep((value) => value - 1)}
              disabled={step === 0 || discovery.saving}
            >
              <ChevronLeft size={tokens.size.icon.lg} color={colors.icon} />
            </IconButton>
          </View>
          <View
            accessible
            accessibilityLabel={`Étape ${step + 1} sur 5`}
            style={styles.progress}
          >
            {steps.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.dot,
                  {
                    width: index === step ? 19 : 5,
                    backgroundColor:
                      index === step ? colors.text : colors.secondaryText,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.trailingAction}>
            <Button
              label={step === 4 ? "Commencer" : "Suivant"}
              trailingIcon={ArrowRight}
              onPress={() =>
                step === 4
                  ? void discovery.finish()
                  : setStep((value) => value + 1)
              }
              loading={discovery.saving}
            />
          </View>
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  // The approved discovery artwork remains centered with its wider illustrative inset.
  stage: {
    flexGrow: 1,
    justifyContent: "center",
    padding: tokens.spacing["2xl"],
  },
  stack: { gap: tokens.spacing.lg },
  card: {
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.panel,
    borderWidth: tokens.border.thin,
    gap: tokens.spacing.md,
  },
  title: tokens.typography.headingXl,
  footer: {
    paddingHorizontal: tokens.spacing["2xl"],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.md,
    alignItems: "center",
    paddingVertical: tokens.spacing.lg,
  },
  previous: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
  },
  progress: {
    flexGrow: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: tokens.spacing.tight,
  },
  dot: { height: 5, borderRadius: tokens.radius.full },
  trailingAction: { marginLeft: "auto", maxWidth: "100%" },
});
