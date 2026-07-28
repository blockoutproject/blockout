import React from "react";
import { View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { iconSize, useAppTheme } from "@/src/shared/theme";

import { useBackOrClose } from "@/src/shared/hooks/use-back-or-close";
import { IconAction } from "@/src/shared/ui/icon-action";
import ScreenHeader from "@/src/shared/ui/entity/screen-header";

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
    <View>
      <ScreenHeader
        title={title}
        testID="legal-doc-header"
        leadingAction={
          <IconAction
            onPress={handleBack}
            accessibilityLabel="Fermer le document"
          >
            <Ionicons name="close" size={iconSize.xl} color={theme.text} />
          </IconAction>
        }
        trailingActions={
          onEdit ? (
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
          ) : null
        }
      />
    </View>
  );
};

export default LegalDocumentHeader;
