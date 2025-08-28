package com.blockout.workernotifications.models.dto.user;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class DeactivatePushTokenRequest {
    private List<String> tokens;
}