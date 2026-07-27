import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { iconSize, useAppTheme } from "@/src/shared/theme";

import { useBackOrClose } from "@/src/shared/hooks/use-back-or-close";
import { IconAction } from "@/src/shared/ui/icon-action";
import ScreenHeader from "@/src/shared/ui/entity/screen-header";

/** Header for club screen with back/close and report. */
export type ClubHeaderProps = {
  /** Screen title. */
  title: string;
  /** Open report modal. */
  onOpenReport: () => void;
};

const ClubHeader: React.FC<ClubHeaderProps> = ({ title, onOpenReport }) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { handleBack, canGoBack } = useBackOrClose();

  return (
    <View style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title={title}
        testID="club-header"
        leadingAction={
          <IconAction
            onPress={handleBack}
            accessibilityLabel={canGoBack ? "Retour" : "Fermer"}
            testID="club-back-action"
          >
            <Ionicons
              name={canGoBack ? "chevron-back-outline" : "close"}
              size={iconSize.navigation}
              color={theme.text}
            />
          </IconAction>
        }
        trailingActions={
          <IconAction
            onPress={onOpenReport}
            accessibilityLabel="Signaler un problème"
            testID="club-report-action"
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

export default ClubHeader;
