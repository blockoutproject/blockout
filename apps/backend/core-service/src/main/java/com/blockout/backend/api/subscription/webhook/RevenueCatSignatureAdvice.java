package com.blockout.backend.api.subscription.webhook;

import java.io.*;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Clock;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

/** Verifies original request bytes before Spring converts the generated webhook DTO. */
@ControllerAdvice(assignableTypes = RevenueCatWebhookController.class)
public class RevenueCatSignatureAdvice extends RequestBodyAdviceAdapter {
  private final RevenueCatWebhookProperties properties;
  private final Clock clock;

  /**
   * Binds verification to API-only credentials and an injectable UTC clock.
   *
   * @param properties configured HMAC secret
   * @param clock delivery timestamp clock
   */
  public RevenueCatSignatureAdvice(RevenueCatWebhookProperties properties, Clock clock) {
    this.properties = properties;
    this.clock = clock;
  }

  /** {@inheritDoc} */
  @Override
  public boolean supports(
      MethodParameter parameter, Type type, Class<? extends HttpMessageConverter<?>> converter) {
    return true;
  }

  /** {@inheritDoc} */
  @Override
  public HttpInputMessage beforeBodyRead(
      HttpInputMessage message,
      MethodParameter parameter,
      Type type,
      Class<? extends HttpMessageConverter<?>> converter)
      throws IOException {
    byte[] bytes = message.getBody().readNBytes(1048577);
    if (bytes.length > 1048576) throw new BadCredentialsException("Webhook authentication failed");
    verify(message.getHeaders().getFirst("X-RevenueCat-Webhook-Signature"), bytes);
    return new HttpInputMessage() {
      /** {@inheritDoc} */
      @Override
      public InputStream getBody() {
        return new ByteArrayInputStream(bytes);
      }

      /** {@inheritDoc} */
      @Override
      public HttpHeaders getHeaders() {
        return message.getHeaders();
      }
    };
  }

  /**
   * Validates the documented signature format and five-minute delivery tolerance.
   *
   * @param header original signature header
   * @param bytes original JSON body
   * @throws BadCredentialsException for absent, malformed or invalid signatures
   */
  private void verify(String header, byte[] bytes) {
    try {
      if (header == null) throw new IllegalArgumentException();
      String[] parts = header.split(",", -1);
      if (parts.length != 2 || !parts[0].startsWith("t=") || !parts[1].startsWith("v1="))
        throw new IllegalArgumentException();
      String timestamp = parts[0].substring(2);
      long seconds = Long.parseLong(timestamp);
      long now = clock.instant().getEpochSecond();
      if (seconds < now - 300 || seconds > now + 300) throw new IllegalArgumentException();
      var mac = Mac.getInstance("HmacSHA256");
      mac.init(
          new SecretKeySpec(
              properties.signingSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
      if (!MessageDigest.isEqual(
          mac.doFinal(bytes), HexFormat.of().parseHex(parts[1].substring(3))))
        throw new IllegalArgumentException();
    } catch (IllegalArgumentException _) {
      throw new BadCredentialsException("Webhook authentication failed");
    } catch (GeneralSecurityException unavailable) {
      throw new IllegalStateException("HMAC unavailable", unavailable);
    }
  }
}
