package com.blockout.mobilegateway.config.api.models;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class UpsertDivisionRequest {

    private String name;

    private String mainColor;

    private String firstGradientColor;

    private String secondGradientColor;

    private String thirdGradientColor;
}
