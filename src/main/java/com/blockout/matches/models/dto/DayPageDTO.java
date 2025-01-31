package com.blockout.matches.models.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DayPageDTO {
    private List<DayMatchesDTO> dayMatches;
    private boolean hasNext;
    private Integer nextPage;
}