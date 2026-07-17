package com.blockout.competitions.association.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.competitions.association.api.v2.CompetitionAssociationApiMapper;
import com.blockout.competitions.association.api.v2.CompetitionAssociationsV2Controller;
import com.blockout.competitions.association.api.v2.CompetitionStatisticsV2Controller;
import com.blockout.competitions.association.application.CompetitionAssociationView;
import com.blockout.competitions.generated.api.CompetitionAssociationsApi;
import com.blockout.competitions.generated.api.CompetitionLifecycleApi;
import com.blockout.competitions.generated.api.CompetitionRankingsApi;
import com.blockout.competitions.generated.api.CompetitionStatisticsApi;
import com.blockout.competitions.generated.model.CompetitionAssociationInternalResponse;
import com.blockout.competitions.generated.model.CompetitionStatisticsSnapshotInternalRequest;
import com.blockout.competitions.generated.model.MissingClubIdsInternalRequest;
import com.blockout.competitions.generated.model.MissingPoolIdsInternalRequest;
import com.blockout.competitions.generated.model.MissingTeamIdsInternalRequest;
import com.blockout.competitions.lifecycle.api.v2.CompetitionLifecycleApiMapper;
import com.blockout.competitions.lifecycle.api.v2.CompetitionLifecycleV2Controller;
import com.blockout.competitions.ranking.api.v2.CompetitionRankingApiMapper;
import com.blockout.competitions.ranking.api.v2.CompetitionRankingsV2Controller;
import com.blockout.competitions.ranking.application.PoolRankingView;
import com.blockout.competitions.ranking.application.TeamRankingView;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class CompetitionV2BoundaryTest {

    @Test
    void controllersImplementOnlyTheGeneratedAssociationStatisticsAndRankingSlices() {
        assertThat(CompetitionAssociationsApi.class).isAssignableFrom(CompetitionAssociationsV2Controller.class);
        assertThat(CompetitionStatisticsApi.class).isAssignableFrom(CompetitionStatisticsV2Controller.class);
        assertThat(CompetitionRankingsApi.class).isAssignableFrom(CompetitionRankingsV2Controller.class);
        assertThat(CompetitionLifecycleApi.class).isAssignableFrom(CompetitionLifecycleV2Controller.class);
    }

    @Test
    void generatedLifecycleRequestsMapImmediatelyToDefensiveSetCommands() {
        CompetitionLifecycleApiMapper mapper = Mappers.getMapper(CompetitionLifecycleApiMapper.class);

        var teams = mapper.toCommand(10L, new MissingTeamIdsInternalRequest(List.of(20L, 20L)));
        var pools = mapper.toCommand(new MissingPoolIdsInternalRequest(List.of(30L, 30L)));
        var clubs = mapper.toCommand(new MissingClubIdsInternalRequest(List.of("club-1", "club-1")));

        assertThat(teams.poolId()).isEqualTo(10L);
        assertThat(teams.teamIds()).containsExactly(20L).isUnmodifiable();
        assertThat(pools.poolIds()).containsExactly(30L).isUnmodifiable();
        assertThat(clubs.clubIds()).containsExactly("club-1").isUnmodifiable();
    }

    @Test
    void generatedLifecycleRequestsUseCanonicalCamelCaseWithTheDefaultMapper() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        String teams = objectMapper.writeValueAsString(new MissingTeamIdsInternalRequest(List.of(20L)));
        String pools = objectMapper.writeValueAsString(new MissingPoolIdsInternalRequest(List.of(30L)));
        String clubs = objectMapper.writeValueAsString(new MissingClubIdsInternalRequest(List.of("club-1")));

        assertThat(teams).contains("\"missingTeamIds\"").doesNotContain("missing_team_ids");
        assertThat(pools).contains("\"missingPoolIds\"").doesNotContain("missing_pool_ids");
        assertThat(clubs).contains("\"missingClubIds\"").doesNotContain("missing_club_ids");
    }

    @Test
    void canonicalLifecycleValidationRejectsInvalidIdentifiersWithoutRejectingEmptySets() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();

            assertThat(validator.validate(new MissingTeamIdsInternalRequest(List.of(0L)))).hasSize(1);
            assertThat(validator.validate(new MissingPoolIdsInternalRequest(List.of(0L)))).hasSize(1);
            assertThat(validator.validate(new MissingClubIdsInternalRequest(List.of("x".repeat(256))))).hasSize(1);
            assertThat(validator.validate(new MissingTeamIdsInternalRequest(List.of()))).isEmpty();
        }
    }

    @Test
    void generatedRankingUsesCanonicalCamelCaseWithTheDefaultMapper() throws Exception {
        CompetitionRankingApiMapper mapper = Mappers.getMapper(CompetitionRankingApiMapper.class);
        var response = mapper.toResponse(new PoolRankingView(10L, List.of(
                new TeamRankingView(20L, 3, 1, 4, 2, 2, 1.5, 1.25))));
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        String body = objectMapper.writeValueAsString(response);

        assertThat(body).contains("\"poolId\"", "\"teamId\"", "\"pointsPenalty\"", "\"coefSets\"",
                "\"coefPoints\"");
        assertThat(body).doesNotContain("pool_id", "team_id", "points_penalty", "coef_sets", "coef_points");
    }

    @Test
    void generatedResponseUsesCanonicalCamelCaseWithTheDefaultMapper() throws Exception {
        CompetitionAssociationApiMapper mapper = Mappers.getMapper(CompetitionAssociationApiMapper.class);
        CompetitionAssociationInternalResponse response = mapper.toResponse(view());
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

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
