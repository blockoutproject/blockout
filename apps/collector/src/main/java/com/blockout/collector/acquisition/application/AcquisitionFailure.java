package com.blockout.collector.acquisition.application;

import com.blockout.collector.acquisition.lnv.LnvAcquisitionException;
import java.net.URI;
import java.util.concurrent.CompletionException;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Existing safe acquisition categories, shared by candidate qualification and observed passages.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
final class AcquisitionFailure {
  /**
   * Classifies transport failures and passage-local memoized failures separately from unsupported
   * content.
   *
   * @param failure absorbed acquisition failure; source bodies/messages are never inspected
   * @return finite technical or structural URI used by current backend evidence
   */
  static URI reasonType(RuntimeException failure) {
    // LNV passage-local completed futures retain one original XML failure without scheduling work.
    Throwable cause = failure;
    while (cause instanceof CompletionException && cause.getCause() != null)
      cause = cause.getCause();
    boolean structural =
        cause instanceof LnvAcquisitionException
            || cause instanceof IllegalArgumentException
            || (cause instanceof FfvbAcquisitionException ffvb
                && ffvb.getKind() == FfvbAcquisitionException.Kind.STRUCTURE);
    return URI.create(
        structural ? "urn:blockout:acquisition:structure" : "urn:blockout:acquisition:technical");
  }
}
