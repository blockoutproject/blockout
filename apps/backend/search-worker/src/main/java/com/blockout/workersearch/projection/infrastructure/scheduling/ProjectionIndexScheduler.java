package com.blockout.workersearch.projection.infrastructure.scheduling;

import com.blockout.workersearch.projection.application.ProjectionRefreshService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProjectionIndexScheduler {

    private final ProjectionRefreshService projectionRefreshService;

    @Scheduled(fixedRate = 3_600_000)
    public void rebuildIndex() {
        projectionRefreshService.rebuildAll();
    }
}
