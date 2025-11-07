import React, { useMemo } from "react";
import { View } from "react-native";
import Filters from "@/src/components/common/Filters";
import { Filter } from "@/src/types/Filter";
import { CORNERS, TABBAR_HEIGHT } from "@/src/theme/globals";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/context/ThemeProvider";

type Props = {
    filters: Filter[];
    setFilters: (next: Filter[] | ((prev: Filter[]) => Filter[])) => void;
    headerOffset: number;
};

const FollowedListHeader: React.FC<Props> = ({ filters, setFilters, headerOffset }) => {
    const theme = useAppTheme();
    const Spacer = useMemo(() => <View style={{ height: headerOffset, backgroundColor: theme.background }} />, [headerOffset]);

    return (
        <View>
            {Spacer}
            <Filters
                filters={filters}
                setFilters={setFilters}
                singleSelect
                requireSelection
                scrollable={false}
                style={{ marginLeft: 4, backgroundColor: 'transparent' }}
                containerStyle={{ paddingVertical: 8, marginBottom: 2, borderRadius: CORNERS, backgroundColor: theme.background}}
            />
        </View>
    );
};

export default FollowedListHeader;