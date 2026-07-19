package com.blockout.config.models.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DivisionUpdateDTO {
    
    private String name;

    private String mainColor;

    private String firstGradientColor;

    private String secondGradientColor;

    private String thirdGradientColor;
}