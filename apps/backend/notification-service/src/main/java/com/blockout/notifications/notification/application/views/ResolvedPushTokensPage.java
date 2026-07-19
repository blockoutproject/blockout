package com.blockout.notifications.notification.application.views;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.Set;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResolvedPushTokensPage {
    private Map<Long, List<String>> tokensByUser;
    private Set<Long> noTokenUserIds;
}
