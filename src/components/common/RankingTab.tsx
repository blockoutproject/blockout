import { View, StyleSheet } from "react-native";
import RankingCard from "./RankingCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Division } from "@/src/types/Division";
import { EnrichedPoolDTO } from "@/src/types/Pool";

type RankingTabProps = {
    enrichedPool: EnrichedPoolDTO;
};

const RankingTab: React.FC<RankingTabProps> = ({ enrichedPool }: RankingTabProps) => {
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 8, backgroundColor: theme.background }]}>
            <RankingCard enrichedPool={enrichedPool} />
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