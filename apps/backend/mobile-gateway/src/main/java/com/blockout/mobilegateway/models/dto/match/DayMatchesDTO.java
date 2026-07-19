package com.blockout.mobilegateway.models.dto.match;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DayMatchesDTO {
    private String date;
    private List<PoolMatchesDTO> pools;
}