package com.blockout.users.models.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class DeactivatePushTokenRequest {
    private List<String> tokens;
}