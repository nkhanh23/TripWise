package com.tripwise.place.infrastructure.persistence;

import com.tripwise.place.application.dto.PlaceModerationBackfillScope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
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
class PlaceImportJdbcRepositoryTest {

    @Mock
    private NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    @Mock
    private JdbcTemplate jdbcTemplate;

    private PlaceImportJdbcRepository repository;

    @BeforeEach
    void setUp() {
        repository = new PlaceImportJdbcRepository(namedParameterJdbcTemplate, jdbcTemplate);
    }

    @Test
    void countPlacesForModerationBackfillShouldBindHoChiMinhAliasAndCurrentFilters() {
        when(namedParameterJdbcTemplate.queryForObject(anyString(), any(MapSqlParameterSource.class), any(Class.class)))
                .thenReturn(0L);

        repository.countPlacesForModerationBackfill(PlaceModerationBackfillScope.builder()
                .sourceName("OSM_GEOFABRIK")
                .city("Ho Chi Minh")
                .currentPlaceType("FOOD")
                .currentVerificationStatus("PENDING")
                .currentRecommendable(Boolean.FALSE)
                .build());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> parametersCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(namedParameterJdbcTemplate).queryForObject(sqlCaptor.capture(), parametersCaptor.capture(), any(Class.class));

        String sql = sqlCaptor.getValue();
        MapSqlParameterSource parameters = parametersCaptor.getValue();

        assertThat(sql).contains("p.source = :sourceName");
        assertThat(sql).contains("p.place_type = :currentPlaceType");
        assertThat(sql).contains("p.verification_status = :currentVerificationStatus");
        assertThat(sql).contains("p.is_recommendable = :currentRecommendable");
        assertThat(sql).contains("LOWER(COALESCE(p.city, '')) IN (:cityAliases)");
        assertThat(sql).contains("LOWER(COALESCE(p.province, '')) IN (:cityRelatedAliases)");
        assertThat(sql).doesNotContain("BTRIM(p.province)");
        assertThat(sql).doesNotContain("BTRIM(p.city)");

        assertThat(parameters.getValue("sourceName")).isEqualTo("OSM_GEOFABRIK");
        assertThat(parameters.getValue("currentPlaceType")).isEqualTo("FOOD");
        assertThat(parameters.getValue("currentVerificationStatus")).isEqualTo("PENDING");
        assertThat(parameters.getValue("currentRecommendable")).isEqualTo(Boolean.FALSE);
        assertThat(parameters.getSqlType("province")).isEqualTo(Types.VARCHAR);
        assertThat(parameters.getSqlType("city")).isEqualTo(Types.VARCHAR);
        assertThat((List<String>) parameters.getValue("cityAliases"))
                .contains("ho chi minh", "ho chi minh city", "thanh pho ho chi minh", "thu duc");
        assertThat((List<String>) parameters.getValue("cityRelatedAliases"))
                .contains("ho chi minh", "thanh pho ho chi minh");
    }

    @Test
    void countPlacesForModerationBackfillShouldAppendKnownLocationOnlyFilterWhenEnabled() {
        when(namedParameterJdbcTemplate.queryForObject(anyString(), any(MapSqlParameterSource.class), any(Class.class)))
                .thenReturn(0L);

        repository.countPlacesForModerationBackfill(PlaceModerationBackfillScope.builder()
                .sourceName("OSM_GEOFABRIK")
                .currentPlaceType("FOOD")
                .currentVerificationStatus("PENDING")
                .currentRecommendable(Boolean.FALSE)
                .knownLocationOnly(true)
                .build());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(namedParameterJdbcTemplate).queryForObject(sqlCaptor.capture(), any(MapSqlParameterSource.class), any(Class.class));

        String sql = sqlCaptor.getValue();
        assertThat(sql).contains("BTRIM(p.province) <> ''");
        assertThat(sql).contains("LOWER(BTRIM(p.province)) NOT IN ('unknown', 'null')");
        assertThat(sql).contains("BTRIM(p.city) <> ''");
        assertThat(sql).contains("LOWER(BTRIM(p.city)) NOT IN ('unknown', 'null')");
    }
}
