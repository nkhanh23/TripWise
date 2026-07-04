package com.tripwise.place.infrastructure.persistence;

import com.tripwise.place.application.dto.MapPlacesQuery;
import com.tripwise.place.application.dto.SearchPlacesQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.sql.Types;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlacePublicReadJdbcRepositoryTest {

    @Mock
    private ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider;

    @Mock
    private NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    private PlacePublicReadJdbcRepository repository;

    @BeforeEach
    void setUp() {
        when(jdbcTemplateProvider.getIfAvailable()).thenReturn(namedParameterJdbcTemplate);
        repository = new PlacePublicReadJdbcRepository(jdbcTemplateProvider);
    }

    @Test
    void searchShouldBindNullableFiltersWithExplicitSqlTypes() {
        when(namedParameterJdbcTemplate.queryForObject(anyString(), any(MapSqlParameterSource.class), any(Class.class)))
                .thenReturn(0L);

        repository.search(
                SearchPlacesQuery.builder().build(),
                org.springframework.data.domain.PageRequest.of(0, 10),
                "name",
                "asc"
        );

        ArgumentCaptor<MapSqlParameterSource> captor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(namedParameterJdbcTemplate).queryForObject(anyString(), captor.capture(), any(Class.class));

        MapSqlParameterSource parameters = captor.getValue();
        assertThat(parameters.getValue("province")).isNull();
        assertThat(parameters.getSqlType("province")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("city")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("categoryId")).isEqualTo(Types.BIGINT);
        assertThat(parameters.getSqlType("priceLevel")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("verificationStatus")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("minRating")).isEqualTo(Types.NUMERIC);
        assertThat(parameters.getSqlType("keywordPattern")).isEqualTo(Types.VARCHAR);
    }

    @Test
    void findMapMarkersShouldBindNullableFiltersWithExplicitSqlTypes() {
        when(namedParameterJdbcTemplate.query(anyString(), any(MapSqlParameterSource.class), any(RowMapper.class)))
                .thenReturn(List.of());

        repository.findMapMarkers(MapPlacesQuery.builder()
                .minLatitude(10.0)
                .minLongitude(100.0)
                .maxLatitude(11.0)
                .maxLongitude(101.0)
                .limit(10)
                .build());

        ArgumentCaptor<MapSqlParameterSource> captor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(namedParameterJdbcTemplate).query(anyString(), captor.capture(), any(RowMapper.class));

        MapSqlParameterSource parameters = captor.getValue();
        assertThat(parameters.getValue("province")).isNull();
        assertThat(parameters.getSqlType("province")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("city")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("categoryId")).isEqualTo(Types.BIGINT);
        assertThat(parameters.getSqlType("verificationStatus")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("minRating")).isEqualTo(Types.NUMERIC);
    }
}
