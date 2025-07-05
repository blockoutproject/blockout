package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class PoolDTO {
    private Long id;

    @JsonProperty("pool_code")
    private String poolCode;

    @JsonProperty("league_code")
    private String leagueCode;

    private Integer season;

    @JsonProperty("league_name")
    private String leagueName;

    private String name;

    @JsonProperty("division_id")
    private Long divisionId;

    private Format format;

    private Gender gender;

    @JsonProperty("followers_count")
    private Long followersCount;

    private Boolean active;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;
}