import React from "react";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { TeamSearchDocDTO } from "@/src/types/Team";
import { EnumGender, GenderLabels } from "@/src/types/enums/Gender";
import { withAlpha } from "@/src/utils/utils";
import EntityGradientCard, { EntityCardChip } from "../common/EntityGradientCard";

export interface TeamCardProps {
    team: TeamSearchDocDTO;
    onPress: () => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onPress }) => {
    const theme = useAppTheme();

    const chips: EntityCardChip[] = [];

    if (team.divisionName) {
        chips.push({
            label: team.divisionName,
        });
    }

    if (team.gender) {
        let genderColor: string;
        switch (team.gender) {
            case "Masculin":
                genderColor = theme.male;
                break;
            case "Féminin":
                genderColor = theme.female;
                break;
            case "Mixte / Autre":
            default:
                genderColor = theme.textSecondary;
                break;
        }

        chips.push({
            label: team.gender,
            borderColor: genderColor,
            backgroundColor: withAlpha(genderColor, 0.12),
        });
    }

    if (team.season) {
        chips.push({
            label: team.season,
        });
    }

    return (
        <EntityGradientCard
            title={team.name}
            imageUri={team.logoUrl}
            chips={chips}
            onPress={onPress}
            testID="team-card"
            marginBottom={12}
            allowChipWrap
        />
    );
};

export default TeamCard;