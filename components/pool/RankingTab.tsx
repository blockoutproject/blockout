import { Pool } from "@/types/Pool";
import { ScrollView, View, StyleSheet } from "react-native";
import RankingCard from "./RankingCard";

type RankingTabProps = {
    pool: Pool;
};

const RankingTab: React.FC<RankingTabProps> = ({ pool }: RankingTabProps) => {

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <RankingCard poolId={pool.id} />
            </ScrollView>
        </View>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 32,
    }
});

export default RankingTab;