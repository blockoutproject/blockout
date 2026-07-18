package com.blockout.workersearch.club.outbound;

import com.blockout.workersearch.club.application.ClubCatalog;
import com.blockout.workersearch.club.application.ClubSnapshot;
import com.blockout.workersearch.clubsclient.api.ClubsClient;
import com.blockout.workersearch.shared.outbound.GeneratedClientPageCollector;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ClubsServiceCatalog implements ClubCatalog {

    private static final int PAGE_SIZE = 100;

    private final ClubsClient client;
    private final ClubSnapshotMapper mapper;

    @Override
    public List<ClubSnapshot> findActiveClubs() {
        return GeneratedClientPageCollector.collect(
                page -> client.listClubs(null, true, page, PAGE_SIZE),
                response -> response.getItems(),
                response -> response.getPageInfo(),
                mapper::toSnapshot);
    }

    @Override
    public ClubSnapshot getById(String id) {
        var response = client.getClub(id);
        return response == null ? null : mapper.toSnapshot(response);
    }
}
