package com.blockout.matches.models.dto.match;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DayMatchesDTO {
    private LocalDate date;
    private List<PoolMatchesDTO> pools;
}