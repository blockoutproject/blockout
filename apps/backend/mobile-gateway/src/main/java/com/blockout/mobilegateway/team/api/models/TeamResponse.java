package com.blockout.mobilegateway.team.api.models;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.pool.api.models.PoolResponse;
import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamResponse {
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

    private ClubResponse club;

    private DivisionResponse division;

    private List<PoolResponse> pools;
}
