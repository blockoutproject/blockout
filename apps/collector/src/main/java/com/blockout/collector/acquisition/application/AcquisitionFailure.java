package com.blockout.collector.acquisition.application;

import com.blockout.collector.acquisition.lnv.LnvAcquisitionException;
import java.io.UncheckedIOException;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.util.concurrent.CompletionException;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.apache.hc.client5.http.HttpResponseException;

/** Safe reasons and categories for provider reads and collector exchanges. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class AcquisitionFailure {
  /**
   * Classifies transport failures and passage-local memoized failures separately from unsupported
   * content.
   *
   * @param failure absorbed acquisition failure; source bodies/messages are never inspected
   * @return finite technical or structural URI used by current backend evidence
   */
  static URI reasonType(RuntimeException failure) {
    Throwable cause = unwrap(failure);
    boolean structural =
        cause instanceof LnvAcquisitionException
            || cause instanceof IllegalArgumentException
            || (cause instanceof FfvbAcquisitionException ffvb
                && ffvb.getKind() == FfvbAcquisitionException.Kind.STRUCTURE);
    return URI.create(
        structural ? "urn:blockout:acquisition:structure" : "urn:blockout:acquisition:technical");
  }

  /** Safe observed reason, or null when the parser or transport supplies no factual explanation. */
  public static String reason(RuntimeException failure) {
    return factualReason(unwrap(failure));
  }

  /** Adds a safe type or exchange category when a factual provider reason is unavailable. */
  static String diagnostic(RuntimeException failure) {
    Throwable cause = unwrap(failure);
    String reason = factualReason(cause);
    if (reason != null) {
      return reason;
    }
    if (cause instanceof CollectionBackendFailure backend) {
      return "Backend " + backend.getKind();
    }
    return cause.getClass().getSimpleName();
  }

  private static Throwable unwrap(RuntimeException failure) {
    Throwable cause = failure;
    while ((cause instanceof CompletionException || cause instanceof UncheckedIOException)
        && cause.getCause() != null) {
      cause = cause.getCause();
    }
    return cause;
  }

  private static String factualReason(Throwable cause) {
    if (cause instanceof FfvbAcquisitionException || cause instanceof LnvAcquisitionException) {
      return cause.getMessage();
    }
    if (cause instanceof HttpResponseException response) {
      return "Provider HTTP " + response.getStatusCode();
    }
    if (cause instanceof SocketTimeoutException) {
      return "Provider read timed out";
    }
    return null;
  }
}
