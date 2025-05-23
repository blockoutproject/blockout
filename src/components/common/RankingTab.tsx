import { View, StyleSheet } from "react-native";
import RankingCard from "./RankingCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/context/ThemeProvider";

type RankingTabProps = {
    poolId: number;
};

const RankingTab: React.FC<RankingTabProps> = ({ poolId }: RankingTabProps) => {
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 16, backgroundColor: theme.background }]}>
            <RankingCard poolId={poolId} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 6,
        paddingTop: 16,
    },
});

export default RankingTab;