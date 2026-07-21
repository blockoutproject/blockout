import React from "react";
import {StyleSheet, StyleSheet as RNStyleSheet, Text, View} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {withAlpha} from "@/src/utils/utils";

const Medal: React.FC<{ rank: 1 | 2 | 3; theme: any }> = ({rank, theme}) => {
  const color =
    rank === 1 ? theme.gold : rank === 2 ? theme.silver : theme.bronze;

  return (
    <View
      style={[
        styles.medalWrap,
        {backgroundColor: withAlpha(color, 0.22), borderColor: color},
      ]}
    >
      <MaterialCommunityIcons name="medal" size={14} color={color}/>
      <Text style={styles.medalRank}>{rank}</Text>
    </View>
  );
};

export default Medal;

const styles = StyleSheet.create({
  medalWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: RNStyleSheet.hairlineWidth,
  },
  medalRank: {fontSize: 12, fontWeight: "800", color: "white"},
});
