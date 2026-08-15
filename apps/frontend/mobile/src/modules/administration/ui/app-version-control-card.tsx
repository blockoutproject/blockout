import React, { useMemo } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import * as Application from "expo-application";

import {
  fontWeight,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import { FormField } from "@/src/shared/ui/form/form-field";
import SheetTextInput from "@/src/shared/ui/form/sheet-text-input";
import { Action } from "@/src/shared/ui/action";
import AdministrationControlCard from "./administration-control-card";

type Props = {
  minVersionIos: string;
  minVersionAndroid: string;
  forceUpdateMessage: string;
  storeUrlIos: string;
  storeUrlAndroid: string;
  lastUpdate?: string;
  loading: boolean;
  saving: boolean;
  isDirty: boolean;
  onChangeMinVersionIos: (v: string) => void;
  onChangeMinVersionAndroid: (v: string) => void;
  onChangeForceUpdateMessage: (v: string) => void;
  onChangeStoreUrlIos: (v: string) => void;
  onChangeStoreUrlAndroid: (v: string) => void;
  onSave: () => void;
};

const CURRENT_APP_VERSION =
  Application.nativeApplicationVersion ??
  Application.nativeBuildVersion ??
  "0.0.0";

const AppVersionControlCard: React.FC<Props> = ({
  minVersionIos,
  minVersionAndroid,
  forceUpdateMessage,
  storeUrlIos,
  storeUrlAndroid,
  lastUpdate,
  loading,
  saving,
  isDirty,
  onChangeMinVersionIos,
  onChangeMinVersionAndroid,
  onChangeForceUpdateMessage,
  onChangeStoreUrlIos,
  onChangeStoreUrlAndroid,
  onSave,
}) => {
  const theme = useAppTheme();

  const trimmedIos = useMemo(
    () => (minVersionIos ?? "").trim(),
    [minVersionIos],
  );
  const trimmedAndroid = useMemo(
    () => (minVersionAndroid ?? "").trim(),
    [minVersionAndroid],
  );
  const trimmedMsg = useMemo(
    () => (forceUpdateMessage ?? "").trim(),
    [forceUpdateMessage],
  );

  const trimmedStoreUrlIos = useMemo(
    () => (storeUrlIos ?? "").trim(),
    [storeUrlIos],
  );
  const trimmedStoreUrlAndroid = useMemo(
    () => (storeUrlAndroid ?? "").trim(),
    [storeUrlAndroid],
  );

  const isValidSemver = (v: string) =>
    v.length === 0 || /^\d+\.\d+\.\d+$/.test(v);

  const iosValid = isValidSemver(trimmedIos);
  const androidValid = isValidSemver(trimmedAndroid);

  const isValidUrl = (v: string) => v.length === 0 || /^https?:\/\/.+/i.test(v);

  const iosUrlValid = isValidUrl(trimmedStoreUrlIos);
  const androidUrlValid = isValidUrl(trimmedStoreUrlAndroid);

  const hasAnyVersion = trimmedIos.length > 0 || trimmedAndroid.length > 0;
  const hasAnyStoreUrl =
    trimmedStoreUrlIos.length > 0 || trimmedStoreUrlAndroid.length > 0;

  const versionRequiredMessage =
    "Renseigne au moins une version minimale (iOS ou Android).";
  const storeRequiredMessage =
    "Renseigne au moins une URL de store (iOS ou Android).";

  const iosVersionError = !iosValid
    ? "Format invalide. Utilise x.y.z (ex : 1.2.0)."
    : !hasAnyVersion && !trimmedAndroid
      ? versionRequiredMessage
      : undefined;

  const androidVersionError = !androidValid
    ? "Format invalide. Utilise x.y.z (ex : 1.2.0)."
    : !hasAnyVersion && !trimmedIos
      ? versionRequiredMessage
      : undefined;

  const iosUrlError = !iosUrlValid
    ? "URL invalide (doit commencer par http:// ou https://)."
    : !hasAnyStoreUrl && !trimmedStoreUrlAndroid
      ? storeRequiredMessage
      : undefined;

  const androidUrlError = !androidUrlValid
    ? "URL invalide (doit commencer par http:// ou https://)."
    : !hasAnyStoreUrl && !trimmedStoreUrlIos
      ? storeRequiredMessage
      : undefined;

  const canSubmit =
    !saving &&
    isDirty &&
    iosValid &&
    androidValid &&
    iosUrlValid &&
    androidUrlValid &&
    hasAnyVersion &&
    hasAnyStoreUrl;

  const showMiniLoader = loading && !saving;

  const handleConfirmSave = () => {
    const title = "Mettre à jour les versions minimales ?";
    const description =
      "Les utilisateurs avec une version trop ancienne devront mettre à jour l’application.";

    Alert.alert(title, description, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Confirmer",
        style: "destructive",
        onPress: onSave,
      },
    ]);
  };

  return (
    <AdministrationControlCard testID="administration-version-card">
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>
            Versions minimales
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: theme.textInactive }]}>
          Force la mise à jour de l’app quand la version installée est trop
          ancienne.
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.textInactive }]}>
          Version de cette app :
        </Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>
          {CURRENT_APP_VERSION}
        </Text>
      </View>

      <FormField
        label="Message affiché lors de la mise à jour forcée"
        error={undefined}
        touched={!!trimmedMsg}
      >
        <SheetTextInput
          value={forceUpdateMessage}
          onChangeText={onChangeForceUpdateMessage}
          placeholder="Ex : Une nouvelle version est dispo, mets l’app à jour pour continuer ✨"
          enableSuggestions
          multiline
          style={{ minHeight: 80, textAlignVertical: "top" }}
        />
      </FormField>

      <FormField
        label="Version minimale iOS (ex : 1.2.0)"
        error={iosVersionError}
        touched
      >
        <SheetTextInput
          value={minVersionIos}
          onChangeText={onChangeMinVersionIos}
          placeholder="Laisser vide si non utilisé"
          keyboardType="numbers-and-punctuation"
          style={iosVersionError ? { borderColor: theme.error } : undefined}
        />
      </FormField>

      <FormField
        label="Version minimale Android (ex : 1.2.0)"
        error={androidVersionError}
        touched
      >
        <SheetTextInput
          value={minVersionAndroid}
          onChangeText={onChangeMinVersionAndroid}
          placeholder="Laisser vide si non utilisé"
          keyboardType="numbers-and-punctuation"
          style={androidVersionError ? { borderColor: theme.error } : undefined}
        />
      </FormField>

      <FormField label="URL App Store iOS" error={iosUrlError} touched>
        <SheetTextInput
          value={storeUrlIos}
          onChangeText={onChangeStoreUrlIos}
          placeholder="https://apps.apple.com/..."
          keyboardType="url"
          style={iosUrlError ? { borderColor: theme.error } : undefined}
        />
      </FormField>

      <FormField label="URL Play Store Android" error={androidUrlError} touched>
        <SheetTextInput
          value={storeUrlAndroid}
          onChangeText={onChangeStoreUrlAndroid}
          placeholder="https://play.google.com/store/..."
          keyboardType="url"
          style={androidUrlError ? { borderColor: theme.error } : undefined}
        />
      </FormField>

      <View style={styles.buttonsRow}>
        <Action
          label="Enregistrer"
          loadingLabel="Enregistrement…"
          variant="destructive"
          onPress={handleConfirmSave}
          disabled={!canSubmit}
          loading={saving}
          fullWidth
          accessibilityLabel="Enregistrer les versions minimales"
          testID="administration-save-versions-action"
        />
      </View>

      <View style={styles.footerRow}>
        {!!lastUpdate && (
          <Text
            style={[styles.lastUpdate, { color: theme.textInactive }]}
            numberOfLines={1}
          >
            Dernière mise à jour : {new Date(lastUpdate).toLocaleString()}
          </Text>
        )}

        {!!showMiniLoader && (
          <View style={styles.miniLoaderRow}>
            <ActivityIndicator size="small" color={theme.textInactive} />
            <Text
              style={[styles.miniLoaderText, { color: theme.textInactive }]}
            >
              Synchronisation…
            </Text>
          </View>
        )}
      </View>
    </AdministrationControlCard>
  );
};

export default AppVersionControlCard;

const styles = StyleSheet.create({
  headerBlock: {
    gap: spacing[2],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: typography.control.fontSize,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.medium,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.tight,
    marginTop: spacing.optical,
  },
  infoLabel: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.medium,
  },
  infoValue: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.bold,
  },
  buttonsRow: {
    alignItems: "stretch",
    gap: spacing.compact,
    marginTop: spacing.compact,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
    marginTop: spacing[1],
  },
  lastUpdate: {
    fontSize: typography.caption.fontSize,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
  },
  miniLoaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.tight,
  },
  miniLoaderText: {
    fontSize: typography.caption.fontSize,
    fontWeight: fontWeight.medium,
  },
});
