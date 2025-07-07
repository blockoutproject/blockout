import { View, StyleSheet } from "react-native";
import RankingCard from "./RankingCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Division } from "@/src/types/Division";

type RankingTabProps = {
    poolId: number;
    division: Division;
};

const RankingTab: React.FC<RankingTabProps> = ({ poolId, division }: RankingTabProps) => {
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 8, backgroundColor: theme.background }]}>
            <RankingCard poolId={poolId} division={division} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 4,
        paddingTop: 16,
    },
});

export default RankingTab;