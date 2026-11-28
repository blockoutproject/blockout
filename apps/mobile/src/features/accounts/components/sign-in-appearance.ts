// Blockout Logos 123:1332 / 123:1346 define the light ink for both wordmark proportions.
export const signInAppearance = {
  light: {
    backdrop: require("../../../../assets/accounts/sign-in-background-light.svg"),
    backdropEdge: "#EFEFEF",
    athlete: require("../../../../assets/accounts/athlete-light.png"),
    ink: "#0A0A0A",
  },
  dark: {
    backdrop: require("../../../../assets/accounts/sign-in-background.svg"),
    backdropEdge: "#232323",
    athlete: require("../../../../assets/accounts/athlete.png"),
    ink: "#F5F5F5",
  },
} as const;
