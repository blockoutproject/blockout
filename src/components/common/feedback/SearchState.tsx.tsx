import React from "react";
import StateCard from "./StateCard";


export type SearchStateProps = {
    title?: string;
    subtitle?: string;
};

const SearchState: React.FC<SearchStateProps> = ({
    title = "Prêt à explorer ?",
    subtitle = "Tape quelque chose pour commencer ta recherche !",
}) => {
    return (
        <StateCard
            title={title}
            subtitle={subtitle}
            illustrationSource={{
                uri: "https://cdn-icons-png.flaticon.com/512/4076/4076549.png",
            }}
            fallbackIcon="magnify"
            containerStyle={{ paddingTop: "30%" }}
        />
    );
};

export default SearchState;