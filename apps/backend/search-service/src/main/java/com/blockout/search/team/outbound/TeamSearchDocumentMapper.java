package com.blockout.search.team.outbound;

import com.blockout.search.shared.mapping.SearchMappingConfig;
import com.blockout.search.team.application.TeamSearchView;
import org.mapstruct.Mapper;

@Mapper(config = SearchMappingConfig.class)
interface TeamSearchDocumentMapper {

    TeamSearchView toView(TeamSearchDocument document);
}
