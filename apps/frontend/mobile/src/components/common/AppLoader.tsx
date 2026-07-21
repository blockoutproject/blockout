import React from "react";
import {Image, StyleSheet, View} from "react-native";
import {MotiView} from "moti";
import {Easing} from "react-native-reanimated";
import {useAppTheme} from "@/src/context/ThemeProvider";

const AppLoader: React.FC = () => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <MotiView
        from={{rotate: "0deg"}}
        animate={{rotate: "360deg"}}
        transition={{
          loop: true,
          type: "timing",
          duration: 1000,
          easing: Easing.linear,
          repeatReverse: false,
        }}
        style={styles.spinner}
      >
        <Image source={require("@/assets/images/blockout-logo-light.png")} style={styles.image}/>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 64,
    height: 64,
  },
});

export default AppLoader;
