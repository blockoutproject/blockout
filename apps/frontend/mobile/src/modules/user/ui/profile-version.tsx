import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { CURRENT_APP_VERSION } from "@/src/modules/app-status/model/app-version";
import { useAppTheme } from "@/src/shared/theme";

const ProfileVersion = () => {
  const theme = useAppTheme();

  return (
    <View style={styles.version}>
      <Text style={[styles.versionText, { color: theme.textInactive }]}>
        Version {CURRENT_APP_VERSION}
      </Text>
    </View>
  );
};

export default ProfileVersion;

const styles = StyleSheet.create({
  version: { alignItems: "center", marginTop: 2 },
  versionText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
});
