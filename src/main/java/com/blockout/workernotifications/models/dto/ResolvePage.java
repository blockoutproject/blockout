package com.blockout.workernotifications.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * DTO interne pratique pour l’orchestrateur:
 * - tokensByUser : mapping userId -> [expoTokens]
 * - noTokenUserIds : users sans aucun token résolu
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResolvePage {
    private Map<Long, List<String>> tokensByUser;
    private Set<Long> noTokenUserIds;
}