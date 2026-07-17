package com.blockout.mobilegateway.shared.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class BinaryPartTest {

    @Test
    void ownsDefensiveCopiesOfMultipartBytes() {
        byte[] source = {1, 2, 3};
        BinaryPart part = new BinaryPart("logo.png", "image/png", source);

        source[0] = 9;
        byte[] returned = part.content();
        returned[1] = 9;

        assertThat(part.content()).containsExactly(1, 2, 3);
    }
}
