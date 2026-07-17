package com.blockout.mobilegateway.models.dto.config;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class DivisionUpdateDTO {
    
    private String name;

    private String mainColor;

    private String firstGradientColor;

    private String secondGradientColor;

    private String thirdGradientColor;
}
