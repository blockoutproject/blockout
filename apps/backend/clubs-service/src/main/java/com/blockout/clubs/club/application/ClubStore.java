package com.blockout.clubs.club.application;

import java.util.List;
import java.util.Optional;

public interface ClubStore {

    List<ClubView> findLegacy(List<String> ids, Boolean active);

    ClubPage findPage(List<String> ids, Boolean active, int page, int pageSize);

    Optional<ClubView> findById(String id);

    ClubView create(CreateClubCommand command, String logoUrl);

    Optional<ClubUpdate> findForUpdate(String id);

    boolean deactivate(String id);
}
