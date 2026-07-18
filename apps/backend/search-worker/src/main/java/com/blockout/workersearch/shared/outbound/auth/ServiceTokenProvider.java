package com.blockout.workersearch.shared.outbound.auth;

public interface ServiceTokenProvider {
    ServiceTokenLease acquire() throws Exception;
}
