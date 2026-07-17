package com.blockout.competitions.association.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.competitions.association.api.v2.CompetitionAssociationApiMapper;
import com.blockout.competitions.association.api.v2.CompetitionAssociationsV2Controller;
import com.blockout.competitions.association.api.v2.CompetitionStatisticsV2Controller;
import com.blockout.competitions.association.application.CompetitionAssociationView;
import com.blockout.competitions.generated.api.CompetitionAssociationsApi;
import com.blockout.competitions.generated.api.CompetitionStatisticsApi;
import com.blockout.competitions.generated.model.CompetitionAssociationInternalResponse;
import com.blockout.competitions.generated.model.CompetitionStatisticsSnapshotInternalRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.Validation;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class CompetitionV2BoundaryTest {

    @Test
    void controllersImplementOnlyTheGeneratedAssociationAndStatisticsSlices() {
        assertThat(CompetitionAssociationsApi.class).isAssignableFrom(CompetitionAssociationsV2Controller.class);
        assertThat(CompetitionStatisticsApi.class).isAssignableFrom(CompetitionStatisticsV2Controller.class);
    }

    @Test
    void generatedResponseStaysCamelCaseUnderTheTemporaryGlobalSnakeMapper() throws Exception {
        CompetitionAssociationApiMapper mapper = Mappers.getMapper(CompetitionAssociationApiMapper.class);
        CompetitionAssociationInternalResponse response = mapper.toResponse(view());
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules()
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);

        String body = objectMapper.writeValueAsString(response);

        assertThat(body).contains("\"poolId\"", "\"teamId\"", "\"clubId\"", "\"winsThreeToZero\"",
                "\"pointsPenalty\"", "\"coefPoints\"");
        assertThat(body).doesNotContain("pool_id", "team_id", "club_id", "wins_three_to_zero",
                "points_penalty", "coef_points");
    }

    @Test
    void canonicalStatisticsRequireTheCompleteSeventeenFieldSnapshot() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var violations = factory.getValidator().validate(new CompetitionStatisticsSnapshotInternalRequest());

            assertThat(violations).hasSize(17);
        }
    }

    private CompetitionAssociationView view() {
        LocalDateTime now = LocalDateTime.now();
        return new CompetitionAssociationView(99L, 10L, 20L, "club-1", true, 1, 2, 3, 4, 5, 6, 7, 8, 9,
                10, 11, 12, 13, 14, 15, 16.5, 17.5, now, now);
    }
}
