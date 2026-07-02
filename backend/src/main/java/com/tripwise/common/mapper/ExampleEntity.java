package com.tripwise.common.mapper;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExampleEntity {
    private Long id;
    private String fullName;
    private String emailAddress;
}
