import React, { type ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  iconSize,
  borderWidth,
  fontWeight,
  radius,
  spacing,
  typography,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
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
                size={iconSize.control}
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
              size={iconSize.control}
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
                size={iconSize.sm}
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
    gap: spacing[3],
    padding: spacing[2],
    paddingBottom: 100,
  },
  subtitle: {
    fontSize: typography.label.fontSize,
    fontWeight: fontWeight.medium,
  },
  platformRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[2],
    marginTop: spacing[2],
  },
  platformIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidth.subtle,
  },
  platformHint: {
    fontSize: typography.caption.fontSize,
    fontWeight: fontWeight.semiBold,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderRadius: radius.md,
    paddingHorizontal: spacing.compact,
    paddingVertical: spacing[2],
    borderWidth: borderWidth.thin,
    marginTop: spacing.compact,
  },
  warningText: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.bold,
    flex: 1,
  },
  fieldBlock: {
    gap: spacing[2],
    marginTop: spacing[3],
  },
  label: {
    fontSize: typography.label.fontSize,
    fontWeight: fontWeight.bold,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: borderWidth.subtle,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.compact,
    paddingVertical: spacing[2],
  },
  input: {
    flex: 1,
    fontSize: typography.body.fontSize,
    paddingVertical: spacing.optical,
  },
  lockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing.optical,
  },
  lockHint: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.bold,
    flex: 1,
  },
});
