package com.blockout.notifications.models.dto.expo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExpoBatchResult {
    private Set<Long> userIdsOk;
    private Set<Long> userIdsFailed;
    private List<String> invalidTokens;
}