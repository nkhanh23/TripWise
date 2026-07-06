package com.tripwise.place.infrastructure.persistence;

import com.tripwise.place.application.dto.AdminPlaceReviewQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
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
class PlaceAdminReviewJdbcRepositoryTest {

    private static final String HO_CHI_MINH = "Hồ Chí Minh";
    private static final String HO_CHI_MINH_LOWER = "hồ chí minh";
    private static final String THANH_PHO_HO_CHI_MINH_LOWER = "thành phố hồ chí minh";
    private static final String THU_DUC_LOWER = "thủ đức";

    @Mock
    private ObjectProvider<NamedParameterJdbcTemplate> jdbcTemplateProvider;

    @Mock
    private NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    private PlaceAdminReviewJdbcRepository repository;

    @BeforeEach
    void setUp() {
        when(jdbcTemplateProvider.getIfAvailable()).thenReturn(namedParameterJdbcTemplate);
        repository = new PlaceAdminReviewJdbcRepository(jdbcTemplateProvider);
    }

    @Test
    void searchShouldBindNullableFiltersWithExplicitSqlTypes() {
        when(namedParameterJdbcTemplate.queryForObject(anyString(), any(MapSqlParameterSource.class), any(Class.class)))
                .thenReturn(0L);

        repository.search(
                AdminPlaceReviewQuery.builder().build(),
                PageRequest.of(0, 20),
                "updatedAt",
                "desc"
        );

        ArgumentCaptor<MapSqlParameterSource> captor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(namedParameterJdbcTemplate).queryForObject(anyString(), captor.capture(), any(Class.class));

        MapSqlParameterSource parameters = captor.getValue();
        assertThat(parameters.getValue("source")).isNull();
        assertThat(parameters.getSqlType("source")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("province")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("city")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("placeType")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("verificationStatus")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("recommendable")).isEqualTo(Types.BOOLEAN);
        assertThat(parameters.getSqlType("keywordPattern")).isEqualTo(Types.VARCHAR);
    }

    @Test
    void searchShouldBindHoChiMinhAliasesForCityFilter() {
        when(namedParameterJdbcTemplate.queryForObject(anyString(), any(MapSqlParameterSource.class), any(Class.class)))
                .thenReturn(0L);

        repository.search(
                AdminPlaceReviewQuery.builder()
                        .city(HO_CHI_MINH)
                        .build(),
                PageRequest.of(0, 20),
                "updatedAt",
                "desc"
        );

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> parametersCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(namedParameterJdbcTemplate).queryForObject(sqlCaptor.capture(), parametersCaptor.capture(), any(Class.class));

        MapSqlParameterSource parameters = parametersCaptor.getValue();
        assertThat(sqlCaptor.getValue()).contains("LOWER(COALESCE(p.city, '')) IN (:cityAliases)");
        assertThat(sqlCaptor.getValue()).contains("LOWER(COALESCE(p.province, '')) IN (:cityRelatedAliases)");
        assertThat(parameters.getValue("city")).isEqualTo(HO_CHI_MINH);
        assertThat((List<String>) parameters.getValue("cityAliases"))
                .contains(HO_CHI_MINH_LOWER, "ho chi minh city", THANH_PHO_HO_CHI_MINH_LOWER, THU_DUC_LOWER);
        assertThat((List<String>) parameters.getValue("cityRelatedAliases"))
                .contains(HO_CHI_MINH_LOWER, THANH_PHO_HO_CHI_MINH_LOWER);
    }
}
