package com.blockout.mobilegateway.shared.api.v1;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.mobilegateway.config.RestTemplateConfig;
import com.blockout.mobilegateway.controllers.v1.LegacyTransportFixtureController;
import com.blockout.mobilegateway.generated.model.UpdateMobileAppStatusRequest;
import com.blockout.mobilegateway.models.dto.config.AppStatusUpdateDTO;
import com.blockout.mobilegateway.models.dto.notification.RegisterPushTokenRequestDTO;
import com.blockout.mobilegateway.models.dto.search.ClubSearchDocDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;

class LegacyMobileGatewayTransportBoundaryTest {

    private final ObjectMapper canonicalMapper = new ObjectMapper().findAndRegisterModules();
    private final LegacyMobileGatewayJson legacyJson = new LegacyMobileGatewayJson(canonicalMapper);

    @Test
    void mvcConverterReadsOnlyLegacyDtosAndNeverWritesResponses() {
        var converter = new LegacyMobileGatewayHttpMessageConverter(legacyJson);

        assertThat(converter.canRead(RegisterPushTokenRequestDTO.class, MediaType.APPLICATION_JSON)).isTrue();
        assertThat(converter.canRead(UpdateMobileAppStatusRequest.class, MediaType.APPLICATION_JSON)).isFalse();
        assertThat(converter.canWrite(RegisterPushTokenRequestDTO.class, MediaType.APPLICATION_JSON)).isFalse();
    }

    @Test
    void responseAdviceBuildsSnakeCaseJsonTreesForV1Controllers() {
        var advice = new LegacyMobileGatewayResponseBodyAdvice(legacyJson);
        var dto = ClubSearchDocDTO.builder().logoUrl("club.png").build();

        JsonNode body = (JsonNode) advice.beforeBodyWrite(
                dto, null, MediaType.APPLICATION_JSON, MappingJackson2HttpMessageConverter.class, null, null);

        assertThat(body.has("logo_url")).isTrue();
        assertThat(body.has("logoUrl")).isFalse();
    }

    @Test
    void mvcBoundaryWritesLegacyResponsesAsSnakeCase() throws Exception {
        mvc().perform(get("/legacy/club"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.logo_url").value("club.png"))
                .andExpect(jsonPath("$.logoUrl").doesNotExist());
    }

    @Test
    void mvcBoundaryReadsLegacyRequestsAsSnakeCase() throws Exception {
        mvc().perform(post("/legacy/push-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expo_push_token\":\"ExponentPushToken[value]\","
                                + "\"platform\":\"IOS\",\"device_id\":\"phone-1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.device_id").value("phone-1"))
                .andExpect(jsonPath("$.deviceId").doesNotExist());
    }

    @Test
    void legacyRestTemplateUsesSnakeCaseWithoutChangingCanonicalTransport() throws Exception {
        var configuration = new RestTemplateConfig(null, null, legacyJson);
        var builder = new RestTemplateBuilder();
        RestTemplate canonical = configuration.internalAuthRestTemplate(builder);
        RestTemplate legacy = configuration.legacyInternalAuthRestTemplate(builder);
        var request = new AppStatusUpdateDTO();
        request.setMinVersionIos("2.0.0");

        assertThat(mapper(canonical).writeValueAsString(request)).contains("\"minVersionIos\"");
        assertThat(mapper(legacy).writeValueAsString(request)).contains("\"min_version_ios\"");
    }

    private ObjectMapper mapper(RestTemplate restTemplate) {
        return restTemplate.getMessageConverters().stream()
                .filter(MappingJackson2HttpMessageConverter.class::isInstance)
                .map(MappingJackson2HttpMessageConverter.class::cast)
                .findFirst()
                .orElseThrow()
                .getObjectMapper();
    }

    private MockMvc mvc() {
        return MockMvcBuilders.standaloneSetup(new LegacyTransportFixtureController())
                .setControllerAdvice(new LegacyMobileGatewayResponseBodyAdvice(legacyJson))
                .setMessageConverters(
                        new LegacyMobileGatewayHttpMessageConverter(legacyJson),
                        new MappingJackson2HttpMessageConverter(canonicalMapper))
                .build();
    }
}
