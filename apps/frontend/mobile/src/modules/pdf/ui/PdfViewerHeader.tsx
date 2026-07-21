import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {Ionicons, MaterialCommunityIcons} from "@expo/vector-icons";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {HEADER_HEIGHT} from "@/src/shared/theme/tokens";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useRouter} from "expo-router";

/** Header for pdf viewer screen with back + report. */
export type PdfViewerHeaderProps = {
  /** Screen title. */
  title?: string;
  /** Open report modal. */
  onOpenReport: () => void;
};

const PdfViewerHeader: React.FC<PdfViewerHeaderProps> = ({title, onOpenReport}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        {
          paddingTop: insets.top,
        },
      ]}
      testID="pdf-viewer-header"
    >
      <View
        style={styles.header}
      >
        <View
          style={styles.leftGroup}
        >
          <TouchableOpacity
            onPress={router.back}
            accessibilityRole="button"
            accessibilityLabel="Fermer le document"
            testID="pdf-viewer-close-action"
            style={styles.backButton}
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
          >
            <Ionicons
              name={"chevron-down-outline"}
              size={28}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
            adjustsFontSizeToFit
            lineBreakStrategyIOS="push-out"
            textBreakStrategy="highQuality"
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onOpenReport}
          accessibilityRole="button"
          accessibilityLabel="Signaler un problème avec ce document"
          testID="pdf-viewer-report-action"
          hitSlop={{
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
          }}
        >
          <MaterialCommunityIcons
            name="flag-outline"
            size={28}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PdfViewerHeader;

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    paddingHorizontal: 12,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    flexGrow: 1,
  },
  backButton: {
    marginRight: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    flexShrink: 1,
  },
});
