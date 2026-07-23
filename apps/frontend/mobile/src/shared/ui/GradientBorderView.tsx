import React from "react";
import {StyleProp, View, ViewStyle} from "react-native";
import {LinearGradient} from "expo-linear-gradient";
import {useAppTheme} from "@/src/shared/theme";

export type GradientBorderViewProps = {
  /** Contenu enfant */
  children: React.ReactNode;
  /** Style du panneau intérieur */
  style?: StyleProp<ViewStyle>;
  /** Style du conteneur extérieur */
  outerStyle?: StyleProp<ViewStyle>;
  /** Rayon extérieur */
  borderRadius?: number;
  /** Largeur de la bordure */
  borderWidth?: number;
  /** Couleurs du dégradé */
  gradient: readonly [string, string, ...string[]];
  /** Point de départ du dégradé */
  start?: { x: number; y: number };
  /** Point d’arrivée du dégradé */
  end?: { x: number; y: number };
};

const GradientBorderView: React.FC<GradientBorderViewProps> = ({
                                                                 children,
                                                                 style,
                                                                 outerStyle,
                                                                 borderRadius = 18,
                                                                 borderWidth = 2,
                                                                 gradient,
                                                                 start = {x: 0, y: 0},
                                                                 end = {x: 1, y: 1},
                                                               }) => {
  const theme = useAppTheme();
  const innerRadius = Math.max(0, borderRadius - borderWidth);

  return (
    <View
      style={[
        {
          borderRadius,
          overflow: "hidden",
        },
        outerStyle,
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={start}
        end={end}
        style={{
          borderRadius,
        }}
      >
        <View
          style={[
            {
              margin: borderWidth,
              borderRadius: innerRadius,
              backgroundColor: theme.backgroundSecondary,
            },
            style,
          ]}
        >
          {children}
        </View>
      </LinearGradient>
    </View>
  );
};

export default GradientBorderView;
