package com.blockout.reports.models.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DataErrorDTO {

    @NotBlank
    private String reference;

    private String field;

    @JsonProperty("current_value")
    private String currentValue;

    @JsonProperty("expected_value")
    private String expectedValue;

    @JsonProperty("source_link")
    private String sourceLink;

    private String context;
}