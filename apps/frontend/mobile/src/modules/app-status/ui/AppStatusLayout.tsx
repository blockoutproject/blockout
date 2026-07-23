import React from "react";
import {StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {useAppTheme} from "@/src/shared/theme";
import MaskedImage from "@/src/shared/ui/images/MaskedImage";

type AppStatusLayoutProps = {
  footer: string;
  testID: string;
  children: React.ReactNode;
};

const AppStatusLayout: React.FC<AppStatusLayoutProps> = ({footer, testID, children}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          backgroundColor: theme.background,
        },
      ]}
      testID={testID}
    >
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <MaskedImage
            fallback={require("@/assets/images/blockout-logo-dark.png")}
            size={32}
            radius={10}
            shadow
          />
          <Text style={[styles.appTitle, {color: theme.text}]}>
            Blockout
          </Text>
        </View>
      </View>

      <View style={styles.centerWrapper}>{children}</View>

      <Text style={[styles.footer, {color: theme.textInactive}]}>
        {footer}
      </Text>
    </View>
  );
};

export default AppStatusLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  centerWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
