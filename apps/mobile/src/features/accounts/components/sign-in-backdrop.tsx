import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { signInAppearance } from "./sign-in-appearance";

/** Shares the approved halo between the full viewport and the invitation hero. */
export function SignInBackdrop() {
  const { scheme } = useTheme();
  const { backdrop, backdropEdge } = signInAppearance[scheme];

  return (
    <Image
      source={backdrop}
      accessible={false}
      pointerEvents="none"
      contentFit="fill"
      style={[StyleSheet.absoluteFill, { backgroundColor: backdropEdge }]}
    />
  );
}
