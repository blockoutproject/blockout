import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { ImageUpload } from "@/src/shared/api/image-upload";
import {
  borderWidth,
  iconSize,
  radius,
  spacing,
  stateOpacity,
  touchTarget,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import FormCard from "@/src/shared/ui/form/form-card";
import { pickSquarePngImage } from "@/src/shared/ui/form/image-picker-adapter";

export type FormImageValue = {
  uri: string | null;
  upload: ImageUpload | null;
  removed: boolean;
};

export type FormImageFieldProps = {
  title: string;
  value: FormImageValue;
  fileName: string;
  placeholder: string;
  pickAccessibilityLabel: string;
  changeLabel: string;
  removeLabel: string;
  contentFit: React.ComponentProps<typeof Image>["contentFit"];
  onChange: (value: FormImageValue) => void;
  pickActionTestID?: string;
  changeActionTestID?: string;
  removeActionTestID?: string;
};

export function FormImageField({
  title,
  value,
  fileName,
  placeholder,
  pickAccessibilityLabel,
  changeLabel,
  removeLabel,
  contentFit,
  onChange,
  pickActionTestID,
  changeActionTestID,
  removeActionTestID,
}: FormImageFieldProps) {
  const theme = useAppTheme();

  const handlePickImage = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
      const upload = await pickSquarePngImage(fileName);

      if (!upload) {
        return;
      }

      onChange({
        uri: upload.uri,
        upload,
        removed: false,
      });
    } catch {
      Alert.alert("Erreur", "Impossible de traiter l’image.");
    }
  }, [fileName, onChange]);

  const handleRemoveImage = useCallback(async () => {
    await Haptics.selectionAsync();
    onChange({
      uri: null,
      upload: null,
      removed: true,
    });
  }, [onChange]);

  return (
    <FormCard title={title}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pickAccessibilityLabel}
        onPress={handlePickImage}
        style={({ pressed }) => [
          styles.imageWrap,
          { borderColor: theme.border },
          pressed ? styles.pressed : undefined,
        ]}
        testID={pickActionTestID}
      >
        <View style={styles.imageMask}>
          {value.uri ? (
            <Image
              source={{ uri: value.uri }}
              style={styles.image}
              contentFit={contentFit}
            />
          ) : (
            <View style={styles.placeholder}>
              <MaterialCommunityIcons
                name="camera-plus-outline"
                size={iconSize.navigation}
                color={theme.textInactive}
              />
              <Text
                style={[styles.placeholderText, { color: theme.textInactive }]}
              >
                {placeholder}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={changeLabel}
          onPress={handlePickImage}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: theme.backgroundSecondary },
            pressed ? styles.pressed : undefined,
          ]}
          testID={changeActionTestID}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={iconSize.sm}
            color={theme.text}
          />
          <Text style={[styles.actionText, { color: theme.text }]}>
            {changeLabel}
          </Text>
        </Pressable>

        {value.uri ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={removeLabel}
            onPress={handleRemoveImage}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: theme.backgroundSecondary },
              pressed ? styles.pressed : undefined,
            ]}
            testID={removeActionTestID}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={iconSize.sm}
              color={theme.error}
            />
            <Text style={[styles.actionText, { color: theme.error }]}>
              {removeLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </FormCard>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: borderWidth.medium,
    borderRadius: radius.xl,
    borderCurve: "continuous",
  },
  imageMask: {
    width: 110,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginVertical: spacing[4],
    borderRadius: radius.hero,
    borderCurve: "continuous",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    alignItems: "center",
    gap: spacing[2],
  },
  placeholderText: {
    ...typography.metadataStrong,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  action: {
    minHeight: touchTarget.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },
  actionText: {
    ...typography.metadataStrong,
  },
  pressed: {
    opacity: stateOpacity.pressed,
  },
});
