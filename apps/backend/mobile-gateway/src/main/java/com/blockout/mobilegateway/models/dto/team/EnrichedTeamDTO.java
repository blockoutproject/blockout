package com.blockout.mobilegateway.models.dto.team;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedTeamDTO {
    private Long id;

    private String name;

    private String clubId;

    private String shortName;

    private String rawName;

    private Format format;

    private Gender gender;

    private String season;

    private Long followersCount;

    private String logoUrl;

    private ClubDTO club; // TODO: Virer apres passage à la 1.1.0

    private DivisionDTO division;

    private List<EnrichedPoolDTO> pools;
}
