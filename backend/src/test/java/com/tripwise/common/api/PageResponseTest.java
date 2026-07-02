package com.tripwise.common.api;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PageResponseTest {

    @Test
    void shouldMapFromSpringPageCorrectly() {
        // Arrange
        List<String> data = List.of("Item 1", "Item 2");
        PageRequest pageRequest = PageRequest.of(0, 10);
        Page<String> springPage = new PageImpl<>(data, pageRequest, 12);

        // Act
        PageResponse<String> pageResponse = PageResponse.of(springPage);

        // Assert
        assertThat(pageResponse.getPage()).isEqualTo(0);
        assertThat(pageResponse.getSize()).isEqualTo(10);
        assertThat(pageResponse.getTotalElements()).isEqualTo(12);
        assertThat(pageResponse.getTotalPages()).isEqualTo(2);
        assertThat(pageResponse.getContent()).containsExactly("Item 1", "Item 2");
    }
}
