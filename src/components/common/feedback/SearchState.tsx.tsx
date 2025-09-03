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
            illustrationSource={require("@/assets/images/search.gif")}
            fallbackIcon="magnify"
            containerStyle={{ paddingTop: "30%" }}
        />
    );
};

export default SearchState;