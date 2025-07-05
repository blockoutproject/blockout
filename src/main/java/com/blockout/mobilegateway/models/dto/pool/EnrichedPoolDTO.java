package com.blockout.mobilegateway.models.dto.pool;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;

import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class EnrichedPoolDTO extends PoolDTO {
    private DivisionDTO division;
}