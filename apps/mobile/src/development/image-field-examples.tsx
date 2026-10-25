import { useImageSelection } from "../shared/images/use-image-selection";
import { useState } from "react";
import { File } from "expo-file-system";
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ImageField,
  type ImageFieldImage,
} from "../shared/components/image-field";
import { useTheme } from "../shared/theme/theme-provider";
import { Button } from "../shared/components/button";
import { tokens } from "../shared/theme/tokens";

/** Isolated native qualification host; accepted previews contain memory data URIs, never retained picker files or uploads. */
export function ImageFieldExamplesScreen() {
  const { colors } = useTheme();
  const [images, setImages] = useState<ImageFieldImage[]>([]);
  const [multiple, setMultiple] = useState(false);
  const [compact, setCompact] = useState(false);
  const [contain, setContain] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [fail, setFail] = useState(false);
  const [error, setError] = useState<string>();
  const selection = useImageSelection({
    multiple,
    selectionLimit: 5,
    onSelect: async (assets, replaceId) => {
      if (fail) throw new Error("Demonstration preparation failure");
      // This preview-only host checks picker metadata, not authoritative upload contents.
      if (
        assets.some(
          (asset) =>
            !["image/png", "image/jpeg"].includes(asset.mimeType ?? "") ||
            asset.fileSize === undefined ||
            asset.fileSize > 5 * 1024 * 1024,
        )
      ) {
        setError("Choisissez une image PNG/JPEG de 5 Mio maximum.");
        return;
      }
      setError(undefined);
      // Read borrowed cache bytes before the selection owner releases them; no filesystem resource outlives this callback.
      const selected: ImageFieldImage[] = [];
      for (const [index, asset] of assets.entries()) {
        selected.push({
          id: asset.uri,
          uri: `data:${asset.mimeType};base64,${await new File(asset.uri).base64()}`,
          label: `Image ${images.length + index + 1}`,
        });
      }
      setImages((current) =>
        replaceId
          ? current.flatMap((image) =>
              image.id === replaceId ? selected : [image],
            )
          : multiple
            ? [...current, ...selected]
            : selected,
      );
    },
  });
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.heading, { color: colors.text }]}
        >
          Images natives
        </Text>
        {[
          { label: "Plusieurs images", value: multiple, change: setMultiple },
          { label: "Taille compacte", value: compact, change: setCompact },
          {
            label: "Respecter les proportions",
            value: contain,
            change: setContain,
          },
          { label: "Désactivé", value: disabled, change: setDisabled },
          { label: "Erreur de préparation", value: fail, change: setFail },
        ].map((option) => (
          <View key={option.label} style={styles.option}>
            <Text style={[tokens.typography.body, { color: colors.text }]}>
              {option.label}
            </Text>
            <Switch
              accessibilityLabel={option.label}
              value={option.value}
              onValueChange={option.change}
            />
          </View>
        ))}
        <Button
          label="Charger un aperçu de test"
          onPress={() => {
            const source = Image.resolveAssetSource(
              require("./assets/image-field-sample.png"),
            );
            if (source) {
              setImages([
                { id: "sample", uri: source.uri, label: "Image de test" },
              ]);
            }
          }}
        />
        <ImageField
          label="Image de démonstration"
          contentFit={contain ? "contain" : "cover"}
          helper="PNG/JPEG, 5 Mio maximum. Aucun envoi."
          images={images}
          multiple={multiple}
          size={compact ? "compact" : "standard"}
          disabled={disabled}
          error={error}
          selection={selection}
          onRemove={(id) => {
            setError(undefined);
            setImages((current) => current.filter((image) => image.id !== id));
          }}
        />
        <Text style={[tokens.typography.body, { color: colors.text }]}>
          {images.length} image(s) conservée(s)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.lg },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
  },
});
