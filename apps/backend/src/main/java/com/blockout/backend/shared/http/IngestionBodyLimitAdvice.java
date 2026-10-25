package com.blockout.backend.shared.http;

import com.blockout.backend.collection.api.CollectionSourcesController;
import com.blockout.backend.collection.api.CollectorOperationsController;
import com.blockout.backend.sporting.api.SportingIngestionController;
import com.blockout.backend.sporting.application.service.ValidateSportingImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Type;
import org.springframework.core.MethodParameter;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

/** Bounds acquisition JSON and source-image bodies before native conversion or domain effects. */
@ControllerAdvice(
    assignableTypes = {
      SportingIngestionController.class,
      CollectionSourcesController.class,
      CollectorOperationsController.class
    })
public class IngestionBodyLimitAdvice extends RequestBodyAdviceAdapter {
  private static final int MAX_JSON_BYTES = 8 * 1024 * 1024;

  /** {@inheritDoc} */
  @Override
  public boolean supports(
      MethodParameter parameter, Type type, Class<? extends HttpMessageConverter<?>> converter) {
    return true;
  }

  /** {@inheritDoc} */
  @Override
  public HttpInputMessage beforeBodyRead(
      HttpInputMessage input,
      MethodParameter parameter,
      Type type,
      Class<? extends HttpMessageConverter<?>> converter)
      throws IOException {
    int limit =
        Resource.class.isAssignableFrom(parameter.getParameterType())
            ? ValidateSportingImage.MAX_BYTES
            : MAX_JSON_BYTES;
    if (input.getHeaders().getContentLength() > limit)
      throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE);
    byte[] bytes = input.getBody().readNBytes(limit + 1);
    if (bytes.length > limit) throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE);
    return new HttpInputMessage() {
      /** {@inheritDoc} */
      @Override
      public InputStream getBody() {
        return new ByteArrayInputStream(bytes);
      }

      /** {@inheritDoc} */
      @Override
      public HttpHeaders getHeaders() {
        return input.getHeaders();
      }
    };
  }
}
