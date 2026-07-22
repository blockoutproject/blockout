package com.blockout.mobilegateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.mobilegateway.api.ClubPublicApi;
import com.blockout.mobilegateway.api.ClubSecureApi;
import com.blockout.mobilegateway.api.ConfigPublicApi;
import com.blockout.mobilegateway.api.ConfigSecureApi;
import com.blockout.mobilegateway.api.FfvbPublicApi;
import com.blockout.mobilegateway.api.MatchPublicApi;
import com.blockout.mobilegateway.api.MatchSecureApi;
import com.blockout.mobilegateway.api.NotificationSecureApi;
import com.blockout.mobilegateway.api.PoolPublicApi;
import com.blockout.mobilegateway.api.PoolSecureApi;
import com.blockout.mobilegateway.api.ReportPublicApi;
import com.blockout.mobilegateway.api.SearchPublicApi;
import com.blockout.mobilegateway.api.TeamPublicApi;
import com.blockout.mobilegateway.api.TeamSecureApi;
import com.blockout.mobilegateway.api.UserSecureApi;
import com.blockout.mobilegateway.api.models.ClubResponse;
import com.blockout.mobilegateway.api.models.UpdateUserRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Method;
import java.util.List;
import org.junit.jupiter.api.Test;

class GatewayJsonContractCharacterizationTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void serializesGeneratedMobileDtosDirectlyInCamelCase() {
        ClubResponse club = new ClubResponse("club-1", "RAW", "Club", true)
            .postalCode("75001")
            .phoneNumber("0102030405")
            .logoUrl("logo.png");

        JsonNode json = objectMapper.valueToTree(club);

        assertThat(json.path("postalCode").asText()).isEqualTo("75001");
        assertThat(json.path("phoneNumber").asText()).isEqualTo("0102030405");
        assertThat(json.path("logoUrl").asText()).isEqualTo("logo.png");
        assertThat(json.has("postal_code")).isFalse();
    }

    @Test
    void keepsTheOfficialPublicRequestNameAndEditableFields() {
        UpdateUserRequest request = new UpdateUserRequest()
            .pseudo("new-pseudo")
            .pictureUrl("picture.png");

        JsonNode json = objectMapper.valueToTree(request);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder("pseudo", "pictureUrl");
    }

    @Test
    void neverExposesInternalContractTypesThroughMobileApis() {
        List<Class<?>> apiTypes = List.of(
            ClubPublicApi.class, ClubSecureApi.class, ConfigPublicApi.class, ConfigSecureApi.class,
            FfvbPublicApi.class, MatchPublicApi.class, MatchSecureApi.class, NotificationSecureApi.class,
            PoolPublicApi.class, PoolSecureApi.class, ReportPublicApi.class, SearchPublicApi.class,
            TeamPublicApi.class, TeamSecureApi.class, UserSecureApi.class);

        assertThat(apiTypes.stream()
            .flatMap(type -> List.of(type.getDeclaredMethods()).stream())
            .filter(method -> !method.isSynthetic())
            .flatMap(this::signatureTypes)
            .filter(name -> name.contains("Internal") || name.contains(".infrastructure.contract."))
            .toList()).isEmpty();
    }

    private java.util.stream.Stream<String> signatureTypes(Method method) {
        return java.util.stream.Stream.concat(
            java.util.stream.Stream.of(method.getGenericReturnType().getTypeName()),
            List.of(method.getGenericParameterTypes()).stream().map(java.lang.reflect.Type::getTypeName));
    }
}
