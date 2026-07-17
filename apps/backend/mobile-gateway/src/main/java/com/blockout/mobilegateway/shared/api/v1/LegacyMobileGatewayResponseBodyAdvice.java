package com.blockout.mobilegateway.shared.api.v1;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice(basePackages = "com.blockout.mobilegateway.controllers.v1")
@RequiredArgsConstructor
public class LegacyMobileGatewayResponseBodyAdvice implements ResponseBodyAdvice<Object> {

    private final LegacyMobileGatewayJson legacyJson;

    @Override
    public boolean supports(
            MethodParameter returnType,
            Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response) {
        if (body == null || body instanceof String || body instanceof byte[] || body instanceof Resource) {
            return body;
        }
        if (body instanceof JsonNode) {
            return body;
        }
        return legacyJson.tree(body);
    }
}
