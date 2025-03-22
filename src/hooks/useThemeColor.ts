import { colors } from "@/src/constants/Colors";
import { useColorScheme } from "@/src/hooks/useColorScheme";

export function useThemeColor(
    props: { light?: string; dark?: string },
    colorName: keyof typeof colors.light & keyof typeof colors.dark
) {
    const theme = useColorScheme() ?? "light";
    const colorFromProps = props[theme];

    if (colorFromProps) {
        return colorFromProps;
    } else {
        return colors[theme][colorName];
    }
}
