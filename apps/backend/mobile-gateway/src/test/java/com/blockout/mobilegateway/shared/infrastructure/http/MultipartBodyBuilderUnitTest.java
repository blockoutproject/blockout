package com.blockout.mobilegateway.shared.infrastructure.http;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("Multipart body builder")
class MultipartBodyBuilderUnitTest {

  @Test
  @DisplayName("serializes the data part as JSON")
  void serializesTheDataPartAsJson() {
    var body =
        MultipartBodyBuilder.buildMultipart(
            JsonMapper.builder().build(), new RequestPayload("Blockout"), null);

    assertThat(body.keySet()).containsExactly("data");
    assertThat(body.getFirst("data"))
        .isInstanceOfSatisfying(
            HttpEntity.class,
            dataPart -> {
              assertThat(dataPart.getHeaders().getContentType())
                  .isEqualTo(MediaType.APPLICATION_JSON);
              assertThat(dataPart.getBody()).isEqualTo("{\"name\":\"Blockout\"}");
            });
  }

  private record RequestPayload(String name) {}
}
