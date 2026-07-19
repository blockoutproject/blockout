package com.blockout.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.config.appstatus.api.v2.AppStatusApiMapper;
import com.blockout.config.appstatus.api.v2.AppStatusV2Controller;
import com.blockout.config.appstatus.application.AppStatusView;
import com.blockout.config.division.api.v2.DivisionApiMapper;
import com.blockout.config.division.api.v2.DivisionV2Controller;
import com.blockout.config.division.application.DivisionView;
import com.blockout.config.generated.api.AppStatusApi;
import com.blockout.config.generated.api.DivisionsApi;
import com.blockout.config.generated.api.RawDivisionMappingsApi;
import com.blockout.config.generated.api.ScraperStatusesApi;
import com.blockout.config.generated.model.UpdateAppStatusInternalRequest;
import com.blockout.config.generated.model.UpdateRawDivisionMappingInternalRequest;
import com.blockout.config.rawmapping.api.v2.RawDivisionMappingV2Controller;
import com.blockout.config.scraperstatus.api.v2.ScraperStatusV2Controller;
import java.time.Instant;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class ConfigV2BoundaryTest {

    @Test
    void controllersImplementEveryRemainingGeneratedConfigBoundary() {
        assertThat(AppStatusApi.class).isAssignableFrom(AppStatusV2Controller.class);
        assertThat(DivisionsApi.class).isAssignableFrom(DivisionV2Controller.class);
        assertThat(RawDivisionMappingsApi.class).isAssignableFrom(RawDivisionMappingV2Controller.class);
        assertThat(ScraperStatusesApi.class).isAssignableFrom(ScraperStatusV2Controller.class);
    }

    @Test
    void generatedModelsMapAtTheHttpBoundaryOnly() {
        AppStatusApiMapper appStatusMapper = Mappers.getMapper(AppStatusApiMapper.class);
        var command = appStatusMapper.toCommand(new UpdateAppStatusInternalRequest().maintenance(true).imageUrl(null));
        assertThat(command.maintenance()).isTrue();
        assertThat(command.imageUrl()).isNull();
        assertThat(appStatusMapper.toResponse(new AppStatusView(
                false, null, null, null, null, null, null, null, Instant.EPOCH)).getLastUpdate())
                .isEqualTo(Instant.EPOCH);

        DivisionApiMapper divisionMapper = Mappers.getMapper(DivisionApiMapper.class);
        var response = divisionMapper.toResponse(new DivisionView(
                7L, "Elite", "#1", "#2", "#3", "#4", null, true, 3L, null, null));
        assertThat(response.getId()).isEqualTo(7L);
        assertThat(response.getName()).isEqualTo("Elite");
        assertThat(response.getLogoUrl()).isNull();
        assertThat(response.getRevision()).isEqualTo(3L);
    }

    @Test
    void canonicalResponsesStayCamelCaseAndRawNullUnmappingRemainsValid() throws Exception {
        DivisionApiMapper divisionMapper = Mappers.getMapper(DivisionApiMapper.class);
        var response = divisionMapper.toResponse(new DivisionView(
                7L, "Elite", "#1", "#2", "#3", "#4", null, true, 3L, null, null));
        var workspaceMapper = JsonMapper.builder().build();
        var json = workspaceMapper.readTree(workspaceMapper.writeValueAsBytes(response));

        assertThat(json.has("mainColor")).isTrue();
        assertThat(json.has("main_color")).isFalse();
        assertThat(json.path("revision").longValue()).isEqualTo(3L);

        try (var validatorFactory = Validation.buildDefaultValidatorFactory()) {
            assertThat(validatorFactory.getValidator().validate(new UpdateRawDivisionMappingInternalRequest()))
                    .isEmpty();
        }
    }
}
