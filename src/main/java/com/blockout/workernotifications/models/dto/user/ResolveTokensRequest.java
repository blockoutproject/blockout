package com.blockout.workernotifications.models.dto.user;

import lombok.Data;

import java.util.List;

@Data
public class ResolveTokensRequest {
    private List<Long> userIds;
}