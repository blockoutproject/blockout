package com.blockout.workersearch.models.docs;

import org.springframework.data.elasticsearch.annotations.Document;

import com.blockout.workersearch.models.dto.team.TeamFormat;
import com.blockout.workersearch.models.dto.team.TeamGender;

import org.springframework.data.annotation.Id;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(indexName = "teams")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDoc {
    @Id
    private Long id;
    private String name;
    private String clubId;
    private String clubName;
    private String clubCity;
    private String divisionName;
    private TeamFormat format;
    private TeamGender gender;
}