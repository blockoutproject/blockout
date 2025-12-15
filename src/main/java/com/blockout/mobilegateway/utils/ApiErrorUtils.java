package com.blockout.mobilegateway.utils;

import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public class ApiErrorUtils {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static String extractMessage(String responseBody) {
        try {
            Map<String, Object> json = objectMapper.readValue(responseBody, new TypeReference<>() {
            });
            Object message = json.get("message");
            return message != null ? message.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    public static String extractCode(String responseBody) {
        try {
            Map<String, Object> json = objectMapper.readValue(responseBody, new TypeReference<>() {
            });
            Object code = json.get("code");
            return code != null ? code.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }
}