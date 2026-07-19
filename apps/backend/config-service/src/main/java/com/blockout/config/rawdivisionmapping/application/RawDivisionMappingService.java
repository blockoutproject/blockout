package com.blockout.config.rawdivisionmapping.application;

import com.blockout.config.rawdivisionmapping.application.commands.CreateRawDivisionMappingCommand;
import com.blockout.config.rawdivisionmapping.application.commands.UpdateRawDivisionMappingCommand;
import com.blockout.config.rawdivisionmapping.application.views.RawDivisionMappingView;

import java.util.List;

/** Defines RawDivisionMapping use cases independently of transport and persistence. */
public interface RawDivisionMappingService {

    /** Creates one provider mapping. */
    RawDivisionMappingView create(CreateRawDivisionMappingCommand command);

    /** Lists mappings with optional league and season filters. */
    List<RawDivisionMappingView> findByLeagueCodeAndSeason(String leagueCode, String season);

    /** Returns one mapping by identifier. */
    RawDivisionMappingView getById(Long id);

    /** Updates one mapping classification. */
    RawDivisionMappingView update(Long id, UpdateRawDivisionMappingCommand command);
}
