package com.blockout.backend.collection.api;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.collection.application.service.RecordCollectionResults;
import com.blockout.backend.generated.mobile.api.CollectionResultsApi;
import com.blockout.backend.generated.mobile.model.CollectionResultPageResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Current operational evidence behind current local collection-management permission. */
@RestController
@RequiredArgsConstructor
public class CollectionResultsController implements CollectionResultsApi {
  private final RecordCollectionResults results;
  private final ReadCollectionConfiguration configurationReads;
  private final CurrentAccount account;
  private final CollectionApiMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CollectionResultPageResponse> listCollectionResults(
      UUID controlId, Long page, Integer size) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(configurationReads.results(account.id(), controlId, page, size)));
  }
}
