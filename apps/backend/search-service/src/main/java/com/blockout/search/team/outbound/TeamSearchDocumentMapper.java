package com.blockout.search.team.outbound;

import com.blockout.search.shared.mapping.SearchMappingConfig;
import com.blockout.search.team.application.TeamSearchResult;
import org.mapstruct.Mapper;

@Mapper(config = SearchMappingConfig.class)
interface TeamSearchDocumentMapper {

    TeamSearchResult toResult(TeamSearchDocument document);
}
