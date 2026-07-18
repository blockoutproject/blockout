package com.blockout.workersearch.models.docs;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;

@Document(indexName = "search-lifecycle-event-receipts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LifecycleEventReceiptDoc {

    @Id
    private String eventId;
    private String eventType;
    private String wireVersion;
    private Instant processedAt;
}
