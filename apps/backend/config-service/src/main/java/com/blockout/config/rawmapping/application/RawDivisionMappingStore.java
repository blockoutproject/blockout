package com.blockout.config.rawmapping.application;

import java.util.List;
import java.util.Optional;

public interface RawDivisionMappingStore {

    RawDivisionMappingView create(CreateRawDivisionMappingCommand command);

    RawDivisionMappingView createLegacy(LegacyRawDivisionMappingSeed seed);

    List<RawDivisionMappingView> find(String leagueCode, String season);

    Optional<RawDivisionMappingView> findById(Long id);

    Optional<RawDivisionMappingView> update(Long id, UpdateRawDivisionMappingCommand command);
}
