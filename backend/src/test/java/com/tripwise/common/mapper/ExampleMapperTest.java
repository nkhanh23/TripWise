package com.tripwise.common.mapper;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {ExampleMapperImpl.class})
class ExampleMapperTest {

    @MockBean
    private JpaMetamodelMappingContext jpaMappingContext;

    @Autowired
    private ExampleMapper exampleMapper;

    @Test
    void shouldMapEntityToDto() {
        ExampleEntity entity = ExampleEntity.builder()
                .id(1L)
                .fullName("John Doe")
                .emailAddress("john@example.com")
                .build();

        ExampleDto dto = exampleMapper.toDto(entity);

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getName()).isEqualTo("John Doe");
        assertThat(dto.getEmail()).isEqualTo("john@example.com");
    }

    @Test
    void shouldMapDtoToEntity() {
        ExampleDto dto = ExampleDto.builder()
                .id(2L)
                .name("Jane Doe")
                .email("jane@example.com")
                .build();

        ExampleEntity entity = exampleMapper.toEntity(dto);

        assertThat(entity).isNotNull();
        assertThat(entity.getId()).isEqualTo(2L);
        assertThat(entity.getFullName()).isEqualTo("Jane Doe");
        assertThat(entity.getEmailAddress()).isEqualTo("jane@example.com");
    }
}
