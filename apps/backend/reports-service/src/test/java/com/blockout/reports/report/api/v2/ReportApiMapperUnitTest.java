package com.blockout.reports.report.api.v2;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.reports.generated.model.CreateReportInternalRequest;
import com.blockout.reports.report.application.ReportCommand;
import com.blockout.reports.report.application.ReportResult;
import com.blockout.shared.model.ReportTypeEnum;
import java.net.URI;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

/** Verifies canonical generated report mapping and response reduction. */
@DisplayName("Report API mapper")
class ReportApiMapperUnitTest {

    private final ReportApiMapper mapper = Mappers.getMapper(ReportApiMapper.class);

    /** Proves generated camelCase input maps without populating v1 compatibility fields. */
    @Test
    @DisplayName("maps the canonical report command")
    void mapsCanonicalReportCommand() {
        CreateReportInternalRequest request = new CreateReportInternalRequest(
                ReportTypeEnum.LOGO, "Missing logo", "A logo is missing", "Guest", "Club", "iOS")
                .appVersion("1.2.3")
                .userId(12L)
                .deviceModel("iPhone");

        ReportCommand command = mapper.toCommand(request);

        assertThat(command.userId()).isEqualTo(12L);
        assertThat(command.displayUserId()).isEqualTo("12");
        assertThat(command.legacyUserId()).isNull();
        assertThat(command.legacyAttachmentImageUrls()).isEmpty();
    }

    /** Proves provider-only compatibility metadata is absent from the canonical response. */
    @Test
    @DisplayName("maps only the canonical report result")
    void mapsOnlyCanonicalReportResult() {
        var response = mapper.toResponse(new ReportResult(
                42, URI.create("https://github.example/issues/42"), "Missing logo", 99L, "OPEN"));

        assertThat(response.getNumber()).isEqualTo(42);
        assertThat(response.getHtmlUrl()).isEqualTo(URI.create("https://github.example/issues/42"));
        assertThat(response.getTitle()).isEqualTo("Missing logo");
    }
}
