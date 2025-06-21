package com.blockout.workersearch.models.events;

import com.blockout.workersearch.models.enums.DivisionCode;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoolUpsertEvent {
    private Long id;
    private String name;
    private DivisionCode divisionCode;
    private String leagueName;
}
