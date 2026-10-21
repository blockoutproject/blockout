package com.blockout.collector.acquisition.lnv;

/** Fixed safe LNV parsing diagnostic, never a raw page or provider-supplied message. */
public class LnvAcquisitionException extends RuntimeException {
  /**
   * Creates a bounded diagnostic chosen by the interpreter.
   *
   * @param message fixed implementation-owned reason
   */
  public LnvAcquisitionException(String message) {
    super(message);
  }
}
