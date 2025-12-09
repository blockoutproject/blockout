import React from "react";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { TeamSummaryDTO } from "@/src/types/Team";
import { EnumGender, GenderLabels } from "@/src/types/enums/Gender";
import { withAlpha } from "@/src/utils/utils";
import EntityGradientCard, { EntityCardChip } from "../common/EntityGradientCard";

export type FollowedTeamCardProps = {
    team: TeamSummaryDTO;
    onPress: () => void;
    testID?: string;
    logoSize?: number;
    borderRadius?: number;
    padding?: number;
    marginBottom?: number;
};

const FollowedTeamCard: React.FC<FollowedTeamCardProps> = ({
    team,
    onPress,
    testID,
    logoSize = 44,
    borderRadius = 16,
    padding = 12,
    marginBottom = 12,
}) => {
    const theme = useAppTheme();

    const title = team.name;
    const division = team.division;
    const gradient = [
        division.firstGradientColor,
        division.secondGradientColor,
        division.thirdGradientColor,
    ] as const;

    const chips: EntityCardChip[] = [];

    if (team.division?.name) {
        chips.push({
            label: team.division.name,
            borderColor: team.division.mainColor,
            backgroundColor: withAlpha(team.division.mainColor, 0.12),
        });
    }

    if (team.season) {
        chips.push({
            label: team.season,
        });
    }

    if (team.gender) {
        let genderColor: string;
        switch (team.gender) {
            case EnumGender.M:
                genderColor = theme.male;
                break;
            case EnumGender.F:
                genderColor = theme.female;
                break;
            case EnumGender.O:
            default:
                genderColor = theme.textSecondary;
                break;
        }

        chips.push({
            label: GenderLabels[team.gender],
            borderColor: genderColor,
            backgroundColor: withAlpha(genderColor, 0.12),
        });
    }

    return (
        <EntityGradientCard
            title={title}
            imageUri={team.logoUrl}
            chips={chips}
            onPress={onPress}
            testID={testID}
            logoSize={logoSize}
            borderRadius={borderRadius}
            padding={padding}
            marginBottom={marginBottom}
            gradient={gradient}
            allowChipWrap={false}
        />
    );
};

export default FollowedTeamCard;