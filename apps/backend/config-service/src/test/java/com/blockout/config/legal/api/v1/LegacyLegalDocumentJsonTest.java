package com.blockout.config.legal.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.config.legal.application.LegalDocumentSnapshot;
import com.blockout.config.legal.application.UpdateLegalDocumentCommand;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class LegacyLegalDocumentJsonTest {

    private final LegacyLegalDocumentJson json = new LegacyLegalDocumentJson();

    @Test
    void writesTheCompleteLegacySnakeCaseBody() throws Exception {
        LegalDocumentSnapshot snapshot = new LegalDocumentSnapshot(
                7L,
                "privacy",
                "Privacy",
                "1.0",
                "# Privacy",
                LocalDateTime.of(2025, 1, 2, 3, 4, 5),
                LocalDateTime.of(2025, 6, 7, 8, 9, 10));

        assertThat(json.write(snapshot)).isEqualTo(
                "{\"id\":7,\"type\":\"privacy\",\"title\":\"Privacy\",\"version\":\"1.0\","
                        + "\"content\":\"# Privacy\",\"created_at\":\"2025-01-02T03:04:05\","
                        + "\"last_update\":\"2025-06-07T08:09:10\"}");
    }

    @Test
    void readsPartialUpdatesAndIgnoresUnknownLegacyFields() throws Exception {
        UpdateLegalDocumentCommand command = json.readUpdate(
                "{\"title\":null,\"version\":\"2.0\",\"content\":null,\"ignored_field\":true}");

        assertThat(command).isEqualTo(new UpdateLegalDocumentCommand(null, "2.0", null));
    }
}
