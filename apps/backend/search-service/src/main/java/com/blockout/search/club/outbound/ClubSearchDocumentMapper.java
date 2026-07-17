package com.blockout.search.club.outbound;

import com.blockout.search.club.application.ClubSearchResult;
import com.blockout.search.shared.mapping.SearchMappingConfig;
import org.mapstruct.Mapper;

@Mapper(config = SearchMappingConfig.class)
interface ClubSearchDocumentMapper {

    ClubSearchResult toResult(ClubSearchDocument document);
}
