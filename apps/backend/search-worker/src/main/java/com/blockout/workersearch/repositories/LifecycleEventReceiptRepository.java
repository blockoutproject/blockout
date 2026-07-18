package com.blockout.workersearch.repositories;

import com.blockout.workersearch.models.docs.LifecycleEventReceiptDoc;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface LifecycleEventReceiptRepository
        extends ElasticsearchRepository<LifecycleEventReceiptDoc, String> {}
