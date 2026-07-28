import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { iconSize, useAppTheme } from "@/src/shared/theme";
import { IconAction } from "@/src/shared/ui/icon-action";
import ScreenHeader from "@/src/shared/ui/entity/screen-header";

export type EntityScreenHeaderProps = {
  title?: string;
  onOpenReport: () => void;
  onEdit?: () => void;
  testID: string;
  backActionTestID: string;
  editActionTestID: string;
  reportActionTestID: string;
};

const EntityScreenHeader = ({
  title,
  onOpenReport,
  onEdit,
  testID,
  backActionTestID,
  editActionTestID,
  reportActionTestID,
}: EntityScreenHeaderProps) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title={title}
        testID={testID}
        leadingAction={
          <IconAction
            onPress={router.back}
            accessibilityLabel="Retour"
            testID={backActionTestID}
          >
            <Ionicons
              name="chevron-back-outline"
              size={iconSize.navigation}
              color={theme.text}
            />
          </IconAction>
        }
        trailingActions={
          <>
            {onEdit ? (
              <IconAction
                onPress={onEdit}
                accessibilityLabel="Modifier"
                testID={editActionTestID}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={iconSize.navigation}
                  color={theme.text}
                />
              </IconAction>
            ) : null}

            <IconAction
              onPress={onOpenReport}
              accessibilityLabel="Signaler un problème"
              testID={reportActionTestID}
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

export default EntityScreenHeader;
