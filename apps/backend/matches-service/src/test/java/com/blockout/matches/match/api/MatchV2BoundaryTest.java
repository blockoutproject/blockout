package com.blockout.matches.match.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.generated.api.MatchDaysApi;
import com.blockout.matches.generated.api.MatchesApi;
import com.blockout.matches.generated.model.CreateMatchInternalRequest;
import com.blockout.matches.generated.model.MatchInternalResponse;
import com.blockout.matches.generated.model.MissingMatchCodesInternalRequest;
import com.blockout.matches.match.api.v2.MatchApiMapper;
import com.blockout.matches.match.api.v2.MatchDaysV2Controller;
import com.blockout.matches.match.api.v2.MatchesV2Controller;
import com.blockout.matches.match.application.MatchSnapshot;
import com.blockout.shared.model.MatchStatusEnum;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class MatchV2BoundaryTest {

    @Test
    void controllersImplementOnlyTheGeneratedMatchCoreAndDaySlices() {
        assertThat(MatchesApi.class).isAssignableFrom(MatchesV2Controller.class);
        assertThat(MatchDaysApi.class).isAssignableFrom(MatchDaysV2Controller.class);
    }

    @Test
    void generatedRequestsMapImmediatelyToRoleOwnedCommands() {
        MatchApiMapper mapper = Mappers.getMapper(MatchApiMapper.class);
        Instant date = Instant.parse("2026-07-17T10:00:00Z");
        CreateMatchInternalRequest request = new CreateMatchInternalRequest(
                "M1", "L1", 9L, 10L, 11L, date, "2026").set("3-1");

        var command = mapper.toCommand(request);

        assertThat(command.matchCode()).isEqualTo("M1");
        assertThat(command.matchDate()).isEqualTo(date);
        assertThat(command.set()).isEqualTo("3-1");
    }

    @Test
    void canonicalModelsUseCamelCaseWithTheDefaultMapper() throws Exception {
        MatchApiMapper mapper = Mappers.getMapper(MatchApiMapper.class);
        MatchInternalResponse response = mapper.toResponse(snapshot());
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        String body = objectMapper.writeValueAsString(response);

        assertThat(body).contains("\"matchCode\"", "\"poolId\"", "\"teamIdA\"", "\"firstReferee\"");
        assertThat(body).doesNotContain("match_code", "pool_id", "team_id_a", "first_referee");
    }

    @Test
    void canonicalValidationRejectsInvalidIdsAndKeepsEmptyDeactivationValid() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            CreateMatchInternalRequest invalid = new CreateMatchInternalRequest(
                    "M1", "L1", 0L, 10L, 11L, Instant.parse("2026-07-17T10:00:00Z"), "2026");

            assertThat(validator.validate(invalid)).hasSize(1);
            assertThat(validator.validate(new MissingMatchCodesInternalRequest(List.of()))).isEmpty();
        }
    }

    private MatchSnapshot snapshot() {
        Instant now = Instant.parse("2026-07-17T10:00:00Z");
        return new MatchSnapshot(1L, "M1", "L1", 9L, null, 10L, 11L, now, "2026", null, null,
                MatchStatusEnum.UPCOMING, null, "First", null, true, now, now);
    }
}
