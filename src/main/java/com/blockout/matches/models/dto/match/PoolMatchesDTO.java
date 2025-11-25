package com.blockout.matches.models.dto.match;

import java.util.List;

import com.blockout.matches.models.entities.Match;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PoolMatchesDTO {
    private Long poolId;
    private List<Match> matches;
}