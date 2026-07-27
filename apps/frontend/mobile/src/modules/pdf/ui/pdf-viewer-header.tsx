import React from "react";
import { View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { iconSize, useAppTheme } from "@/src/shared/theme";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { IconAction } from "@/src/shared/ui/icon-action";
import ScreenHeader from "@/src/shared/ui/entity/screen-header";

/** Header for pdf viewer screen with back + report. */
export type PdfViewerHeaderProps = {
  /** Screen title. */
  title?: string;
  /** Open report modal. */
  onOpenReport: () => void;
};

const PdfViewerHeader: React.FC<PdfViewerHeaderProps> = ({
  title,
  onOpenReport,
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title={title}
        testID="pdf-viewer-header"
        leadingAction={
          <IconAction
            onPress={router.back}
            accessibilityLabel="Fermer le document"
            testID="pdf-viewer-close-action"
          >
            <Ionicons
              name="chevron-down-outline"
              size={iconSize.navigation}
              color={theme.text}
            />
          </IconAction>
        }
        trailingActions={
          <IconAction
            onPress={onOpenReport}
            accessibilityLabel="Signaler un problème avec ce document"
            testID="pdf-viewer-report-action"
          >
            <MaterialCommunityIcons
              name="flag-outline"
              size={iconSize.navigation}
              color={theme.text}
            />
          </IconAction>
        }
      />
    </View>
  );
};

export default PdfViewerHeader;
