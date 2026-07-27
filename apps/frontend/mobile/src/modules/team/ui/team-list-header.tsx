import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { iconSize, useAppTheme } from "@/src/shared/theme";

import { useBackOrClose } from "@/src/shared/hooks/use-back-or-close";
import { IconAction } from "@/src/shared/ui/icon-action";
import ScreenHeader from "@/src/shared/ui/entity/screen-header";

export type TeamListHeaderProps = {
  title: string;
  onOpenReport: () => void;
  rightAddon?: React.ReactNode;
};

const TeamListHeader: React.FC<TeamListHeaderProps> = ({
  title,
  onOpenReport,
  rightAddon,
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { handleBack, canGoBack } = useBackOrClose();

  return (
    <View style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title={title}
        leadingAction={
          <IconAction
            onPress={handleBack}
            accessibilityLabel={canGoBack ? "Revenir en arrière" : "Fermer"}
          >
            <Ionicons
              name={canGoBack ? "chevron-back-outline" : "close"}
              size={iconSize.lg}
              color={theme.text}
            />
          </IconAction>
        }
        trailingActions={
          <>
            {rightAddon}
            <IconAction
              onPress={onOpenReport}
              accessibilityLabel="Signaler un problème"
            >
              <MaterialCommunityIcons
                name="flag-outline"
                size={iconSize.navigation}
                color={theme.text}
              />
            </IconAction>
          </>
        }
      />
    </View>
  );
};

export default TeamListHeader;
