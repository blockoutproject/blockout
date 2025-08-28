package com.blockout.workernotifications.models.dto.user;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
public class ResolveTokensResponse {
    private Map<Long, List<String>> tokensByUserId;
}