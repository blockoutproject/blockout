import { View, StyleSheet } from "react-native";
import RankingCard from "./RankingCard";
import { colors } from "@/src/constants/Colors";

type RankingTabProps = {
    poolId: number;
};

const RankingTab: React.FC<RankingTabProps> = ({ poolId }: RankingTabProps) => {

    return (
        <View style={styles.container}>
                <RankingCard poolId={poolId} />
        </View>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.dark,
        paddingHorizontal: 8,
        paddingTop: 16,
        paddingBottom: 32,
    }
});

export default RankingTab;