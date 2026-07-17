package com.blockout.workersearch.club.outbound;

import com.blockout.shared.model.PageInfo;
import com.blockout.workersearch.club.application.ClubCatalog;
import com.blockout.workersearch.club.application.ClubSnapshot;
import com.blockout.workersearch.clubsclient.api.ClubsClient;
import com.blockout.workersearch.clubsclient.model.ClubInternalPageResponse;
import java.util.ArrayList;
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
        List<ClubSnapshot> clubs = new ArrayList<>();
        int page = 0;
        boolean hasNext;
        do {
            ClubInternalPageResponse response = client.listClubs(null, true, page, PAGE_SIZE);
            if (response == null) {
                return List.copyOf(clubs);
            }
            if (response.getItems() != null) {
                response.getItems().stream().map(mapper::toSnapshot).forEach(clubs::add);
            }
            PageInfo pageInfo = response.getPageInfo();
            hasNext = pageInfo != null && Boolean.TRUE.equals(pageInfo.getHasNext());
            page++;
        } while (hasNext);
        return List.copyOf(clubs);
    }

    @Override
    public ClubSnapshot getById(String id) {
        var response = client.getClub(id);
        return response == null ? null : mapper.toSnapshot(response);
    }
}
