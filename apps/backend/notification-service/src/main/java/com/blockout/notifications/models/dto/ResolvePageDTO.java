package com.blockout.notifications.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.Set;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResolvePageDTO {
    private Map<Long, List<String>> tokensByUser;
    private Set<Long> noTokenUserIds;
}