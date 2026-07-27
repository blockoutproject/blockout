import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  iconSize,
  layout,
  spacing,
  touchTarget,
  useAppTheme,
} from "@/src/shared/theme";

import { useBackOrClose } from "@/src/shared/hooks/use-back-or-close";
import { IconAction } from "@/src/shared/ui/icon-action";

/** Header for a legal document in a sheet. */
export type LegalDocumentHeaderProps = {
  /** Title to display. */
  title: string;
  /** Close sheet callback. */
  onCloseSheet?: () => void;
  /** Open edit form. */
  onEdit?: () => void;
};

const LegalDocumentHeader: React.FC<LegalDocumentHeaderProps> = ({
  title,
  onCloseSheet,
  onEdit,
}) => {
  const theme = useAppTheme();
  const { handleBack } = useBackOrClose(onCloseSheet);

  return (
    <View style={styles.container} testID="legal-doc-header">
      <View style={styles.header}>
        <View style={styles.leftGroup}>
          <IconAction
            onPress={handleBack}
            accessibilityLabel="Fermer le document"
          >
            <Ionicons name="close" size={iconSize.xl} color={theme.text} />
          </IconAction>

          <Text
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {onEdit ? (
          <IconAction
            onPress={onEdit}
            accessibilityLabel="Modifier le document"
          >
            <MaterialCommunityIcons
              name="pencil"
              size={iconSize.lg}
              color={theme.text}
            />
          </IconAction>
        ) : (
          <View style={styles.actionSpacer} />
        )}
      </View>
    </View>
  );
};

export default LegalDocumentHeader;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
  header: {
    height: layout.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing[1],
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
  },
  actionSpacer: {
    width: touchTarget.minimum,
  },
});
