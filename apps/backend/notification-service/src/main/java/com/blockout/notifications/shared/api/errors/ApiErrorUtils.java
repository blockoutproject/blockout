package com.blockout.notifications.shared.api.errors;

import java.util.Map;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

public class ApiErrorUtils {

  private static final ObjectMapper objectMapper = JsonMapper.builder().build();

  public static String extractMessage(String responseBody) {
    try {
      Map<String, Object> json = objectMapper.readValue(responseBody, new TypeReference<>() {});
      Object message = json.get("message");
      return message != null ? message.toString() : null;
    } catch (Exception e) {
      return null;
    }
  }
}
