package com.blockout.search.pool.outbound;

import com.blockout.search.pool.application.PoolSearchResult;
import com.blockout.search.shared.mapping.SearchMappingConfig;
import org.mapstruct.Mapper;

@Mapper(config = SearchMappingConfig.class)
interface PoolSearchDocumentMapper {

    PoolSearchResult toResult(PoolSearchDocument document);
}
