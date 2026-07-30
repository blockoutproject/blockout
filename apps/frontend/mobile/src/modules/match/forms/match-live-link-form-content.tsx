import React, { type ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme, withAlpha } from "@/src/shared/theme";
import FormCard from "@/src/shared/ui/form/form-card";
import { FormField } from "@/src/shared/ui/form/form-field";
import type { MatchLiveLinkFormPresentation } from "@/src/modules/match/view-models/match-live-link-form-presentation";

export type MatchLiveLinkFormContentProps = {
  error?: string;
  loading: boolean;
  onBlur: ComponentProps<typeof BottomSheetTextInput>["onBlur"];
  onChangeText: ComponentProps<typeof BottomSheetTextInput>["onChangeText"];
  presentation: MatchLiveLinkFormPresentation;
  touched?: boolean;
  url: string;
};

/**
 * Renders the live-link form fields and explanatory states.
 */
const MatchLiveLinkFormContent = ({
  error,
  loading,
  onBlur,
  onChangeText,
  presentation,
  touched,
  url,
}: MatchLiveLinkFormContentProps) => {
  const theme = useAppTheme();
  const showFieldError = touched && Boolean(error);

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <FormCard title={presentation.title}>
        <Text style={[styles.subtitle, { color: theme.textInactive }]}>
          {presentation.subtitle}
        </Text>

        <View style={styles.platformRow}>
          {(["youtube", "twitch", "facebook"] as const).map((icon) => (
            <View
              key={icon}
              style={[
                styles.platformIcon,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={icon}
                size={18}
                color={theme.textInactive}
              />
            </View>
          ))}

          <Text style={[styles.platformHint, { color: theme.textInactive }]}>
            Plateformes supportées
          </Text>
        </View>

        {presentation.showReplayWarning ? (
          <View
            style={[
              styles.warningBox,
              {
                backgroundColor: withAlpha(theme.warning, 0.12),
                borderColor: theme.warning,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={18}
              color={theme.warning}
            />
            <Text style={[styles.warningText, { color: theme.warning }]}>
              Les rediffusions sont soumises à validation. Ton lien sera affiché
              une fois approuvé par la modération.
            </Text>
          </View>
        ) : null}

        <View style={styles.fieldBlock}>
          <Text style={[styles.label, { color: theme.text }]}>
            Lien du live
          </Text>

          {presentation.isLocked ? (
            <View style={styles.lockBanner}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color={theme.warning}
              />
              <Text style={[styles.lockHint, { color: theme.warning }]}>
                Tu pourras ajouter ou modifier le lien à partir d’une heure
                avant le début du match.
              </Text>
            </View>
          ) : (
            <FormField error={error} touched={touched}>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    borderColor: showFieldError ? theme.error : theme.border,
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                <BottomSheetTextInput
                  value={url}
                  onChangeText={onChangeText}
                  onBlur={onBlur}
                  placeholder="https://youtube.com/…"
                  placeholderTextColor={theme.textInactive}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!loading}
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
            </FormField>
          )}
        </View>
      </FormCard>
    </BottomSheetScrollView>
  );
};

export default MatchLiveLinkFormContent;

const styles = StyleSheet.create({
  scroll: {
    gap: 12,
    padding: 8,
    paddingBottom: 100,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  platformRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  platformIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  platformHint: {
    fontSize: 11,
    fontWeight: "600",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  fieldBlock: {
    gap: 8,
    marginTop: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  lockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  lockHint: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
});
