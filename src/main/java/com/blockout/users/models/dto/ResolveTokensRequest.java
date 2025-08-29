package com.blockout.users.models.dto;

import lombok.Data;

import java.util.List;

@Data
public class ResolveTokensRequest {
    private List<Long> userIds;
}