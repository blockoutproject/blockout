import { StyleSheet, View } from "react-native";
import { tokens } from "../theme/tokens";

/** Native lists share the approved gap without coupling rows to request or selection state. */
export function ListSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  separator: { height: tokens.layout.list.gap },
});
