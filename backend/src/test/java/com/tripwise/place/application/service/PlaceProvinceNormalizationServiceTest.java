package com.tripwise.place.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.place.infrastructure.persistence.PlaceImportJdbcRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class PlaceProvinceNormalizationServiceTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
    private final PlaceProvinceNormalizationService service =
            new PlaceProvinceNormalizationService(repository, OBJECT_MAPPER);

    @Test
    void shouldResolveHoChiMinhCityToHoChiMinhProvince() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Ho Chi Minh City");
        assertThat(province).isEqualTo("Hồ Chí Minh");
    }

    @Test
    void shouldResolveHaNoiToHaNoiProvince() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Hà Nội");
        assertThat(province).isEqualTo("Hà Nội");
    }

    @Test
    void shouldResolveNhaTrangToKhanhHoaProvince() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Nha Trang");
        assertThat(province).isEqualTo("Khánh Hòa");
    }

    @Test
    void shouldResolveDaNangToDaNangProvince() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Đà Nẵng");
        assertThat(province).isEqualTo("Đà Nẵng");
    }

    @Test
    void shouldResolveHoiAnToQuangNamProvince() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Hội An");
        assertThat(province).isEqualTo("Quảng Nam");
    }

    @Test
    void shouldResolveHueToThuaThienHueProvince() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Huế");
        assertThat(province).isEqualTo("Thừa Thiên Huế");
    }

    @Test
    void shouldResolveCanThoToCanThoProvince() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Cần Thơ");
        assertThat(province).isEqualTo("Cần Thơ");
    }

    @Test
    void shouldResolveNinhKieuToCanThoProvince() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Ninh Kiều");
        assertThat(province).isEqualTo("Cần Thơ");
    }

    @Test
    void shouldResolveHaiPhongToHaiPhongProvince() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Hải Phòng");
        assertThat(province).isEqualTo("Hải Phòng");
    }

    @Test
    void shouldResolveDaLatToLamDongProvince() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Đà Lạt");
        assertThat(province).isEqualTo("Lâm Đồng");
    }

    @Test
    void shouldReturnNullForUnknownCity() {
        String province = PlaceProvinceNormalizationService.resolveProvince("Unknown");
        assertThat(province).isNull();
    }

    @Test
    void shouldReturnNullForNullCity() {
        String province = PlaceProvinceNormalizationService.resolveProvince(null);
        assertThat(province).isNull();
    }

    @Test
    void shouldReturnNullForBlankCity() {
        String province = PlaceProvinceNormalizationService.resolveProvince("  ");
        assertThat(province).isNull();
    }

    @Test
    void shouldHandleCaseInsensitiveMapping() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("ho chi minh city")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("HO CHI MINH CITY")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("hồ chí minh")).isEqualTo("Hồ Chí Minh");
    }

    @Test
    void shouldHandleAccents() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Sài Gòn")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Hà Nội")).isEqualTo("Hà Nội");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Đà Nẵng")).isEqualTo("Đà Nẵng");
    }

    @Test
    void shouldResolveSpecialCharactersInCity() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Saigon")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("TP. Hồ Chí Minh")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("TP HCM")).isEqualTo("Hồ Chí Minh");
    }

    @Test
    void shouldIdentifyUnsafePhuongDucThang() {
        assertThat(PlaceProvinceNormalizationService.isUnsafe("Phường Đức Thắng")).isTrue();
    }

    @Test
    void shouldIdentifyUnsafePhuong3() {
        assertThat(PlaceProvinceNormalizationService.isUnsafe("Phường 3")).isTrue();
    }

    @Test
    void shouldIdentifyUnsafeMiamiFL() {
        assertThat(PlaceProvinceNormalizationService.isUnsafe("Miami, FL")).isTrue();
    }

    @Test
    void shouldNotFlagSafeCityAsUnsafe() {
        assertThat(PlaceProvinceNormalizationService.isUnsafe("Hồ Chí Minh")).isFalse();
        assertThat(PlaceProvinceNormalizationService.isUnsafe("Hà Nội")).isFalse();
        assertThat(PlaceProvinceNormalizationService.isUnsafe("Nha Trang")).isFalse();
    }

    @Test
    void dryRunShouldNotCallUpdateRepository() {
        doReturn(List.of()).when(repository).findProvinceNullCandidates();

        var report = service.runDryRun("OSM_GEOFABRIK", 100);

        verify(repository, never()).updateProvinceBatch(any(), any());
        assertThat(report.noDbUpdateExecuted()).isTrue();
        assertThat(report.totalCandidates()).isZero();
    }

    @Test
    void dryRunShouldReturnReportForHcmcCandidate() {
        doReturn(List.of(candidate(1L, "Bun Bo", "Ho Chi Minh City", null, "FOOD", "PENDING", false)))
                .when(repository).findProvinceNullCandidates();

        var report = service.runDryRun("OSM_GEOFABRIK", 100);

        assertThat(report.noDbUpdateExecuted()).isTrue();
        assertThat(report.totalCandidates()).isEqualTo(1);
        assertThat(report.wouldNormalize()).isEqualTo(1);
        assertThat(report.skippedUnsafe()).isZero();
        assertThat(report.byTargetProvince()).containsEntry("Hồ Chí Minh", 1L);
        assertThat(report.byPlaceType()).containsEntry("FOOD", 1L);
        assertThat(report.samples()).singleElement().satisfies(sample -> {
            assertThat(sample.predictedProvince()).isEqualTo("Hồ Chí Minh");
            assertThat(sample.city()).isEqualTo("Ho Chi Minh City");
        });
    }

    @Test
    void dryRunShouldReturnReportForHaNoiCandidate() {
        doReturn(List.of(candidate(2L, "Pho", "Hà Nội", null, "FOOD", "AUTO_APPROVED", true)))
                .when(repository).findProvinceNullCandidates();

        var report = service.runDryRun("OSM_GEOFABRIK", 100);

        assertThat(report.totalCandidates()).isEqualTo(1);
        assertThat(report.wouldNormalize()).isEqualTo(1);
        assertThat(report.byTargetProvince()).containsEntry("Hà Nội", 1L);
        assertThat(report.publicAffected()).isEqualTo(1);
    }

    @Test
    void dryRunShouldSkipUnsafeCity() {
        doReturn(List.of(candidate(3L, "Cafe", "Phường 3", null, "FOOD", "PENDING", false)))
                .when(repository).findProvinceNullCandidates();

        var report = service.runDryRun("OSM_GEOFABRIK", 100);

        assertThat(report.totalCandidates()).isEqualTo(1);
        assertThat(report.wouldNormalize()).isZero();
        assertThat(report.skippedUnsafe()).isEqualTo(1);
    }

    @Test
    void dryRunShouldSkipUnsafeCrossBorder() {
        doReturn(List.of(
                candidate(4L, "Place", "Miami, FL", null, "ATTRACTION", "PENDING", false)
        )).when(repository).findProvinceNullCandidates();

        var report = service.runDryRun("OSM_GEOFABRIK", 100);

        assertThat(report.wouldNormalize()).isZero();
        assertThat(report.skippedUnsafe()).isEqualTo(1);
    }

    @Test
    void dryRunShouldCountPublicAffected() {
        doReturn(List.of(
                candidate(5L, "Attraction", "Hội An", null, "ATTRACTION", "AUTO_APPROVED", true),
                candidate(6L, "Food", "Hội An", null, "FOOD", "PENDING", false)
        )).when(repository).findProvinceNullCandidates();

        var report = service.runDryRun("OSM_GEOFABRIK", 100);

        assertThat(report.wouldNormalize()).isEqualTo(2);
        assertThat(report.publicAffected()).isEqualTo(1);
    }

    @Test
    void applyShouldUpdateForOsmSource() {
        doReturn(List.of(candidate(7L, "Quan", "Hồ Chí Minh", null, "FOOD", "PENDING", false)))
                .when(repository).findProvinceNullCandidates();
        doReturn(1).when(repository).updateProvinceBatch(eq("OSM_GEOFABRIK"), any());

        var report = service.runApply("OSM_GEOFABRIK", 100);

        assertThat(report.noDbUpdateExecuted()).isFalse();
        assertThat(report.updatedCount()).isEqualTo(1);
        assertThat(report.totalCandidates()).isEqualTo(1);
        verify(repository).updateProvinceBatch(eq("OSM_GEOFABRIK"), any());
    }

    @Test
    void shouldThrowWhenApplyForNonOsmSource() {
        assertThatThrownBy(() -> service.runApply("MANUAL_SEED", 100))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APPLY mode is restricted to source=OSM_GEOFABRIK");
    }

    @Test
    void shouldResolveHcmcAliases() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Saigon")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Sài Gòn")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("TPHCM")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("HCMC")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Thành phố Hồ Chí Minh")).isEqualTo("Hồ Chí Minh");
    }

    @Test
    void shouldResolveHanoiDistricts() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Đống Đa")).isEqualTo("Hà Nội");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Ba Đình")).isEqualTo("Hà Nội");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Cầu Giấy")).isEqualTo("Hà Nội");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Tây Hồ")).isEqualTo("Hà Nội");
    }

    @Test
    void shouldResolveHcmcDistricts() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Bình Thạnh")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Quận 1")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Quận 7")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Thủ Đức")).isEqualTo("Hồ Chí Minh");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Tân Bình")).isEqualTo("Hồ Chí Minh");
    }

    @Test
    void shouldResolveCanThoDistricts() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Ninh Kiều")).isEqualTo("Cần Thơ");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Cái Răng")).isEqualTo("Cần Thơ");
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Bình Thủy")).isEqualTo("Cần Thơ");
    }

    @Test
    void shouldResolveQuanPhuNhuanToHoChiMinh() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Qu\u1eadn Ph\u00fa Nhu\u1eadn"))
                .isEqualTo("H\u1ed3 Ch\u00ed Minh");
    }

    @Test
    void shouldResolveStyledBinhThanhToHoChiMinh() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("\ud835\uddd5\ud835\uddf6\u0300\ud835\uddfb\ud835\uddf5 \ud835\udde7\ud835\udc21\ud835\udc1a\u0323\ud835\udc27\ud835\udc21"))
                .isEqualTo("H\u1ed3 Ch\u00ed Minh");
    }

    @Test
    void shouldResolveBiinhThuyToCanTho() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Bi\u00ecnh Th\u1ee7y"))
                .isEqualTo("C\u1ea7n Th\u01a1");
    }

    @Test
    void shouldResolveLaiVungToDongThap() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Lai Vung"))
                .isEqualTo("\u0110\u1ed3ng Th\u00e1p");
    }

    @Test
    void shouldResolveThiTranLaiVungToDongThap() {
        assertThat(PlaceProvinceNormalizationService.resolveProvince("Th\u1ecb tr\u1ea5n Lai Vung"))
                .isEqualTo("\u0110\u1ed3ng Th\u00e1p");
    }

    @Test
    void shouldKeepXaXuanTruongUnsafe() {
        assertThat(PlaceProvinceNormalizationService.isUnsafe("X\u00e3 Xu\u00e2n Tr\u01b0\u1eddng")).isTrue();
        assertThat(PlaceProvinceNormalizationService.resolveProvince("X\u00e3 Xu\u00e2n Tr\u01b0\u1eddng")).isNull();
    }

    @Test
    void shouldKeepXaDongThanhUnsafe() {
        assertThat(PlaceProvinceNormalizationService.isUnsafe("X\u00e3 \u0110\u00f4ng Th\u1ea1nh")).isTrue();
        assertThat(PlaceProvinceNormalizationService.resolveProvince("X\u00e3 \u0110\u00f4ng Th\u1ea1nh")).isNull();
    }

    private PlaceImportJdbcRepository.ProvinceNormalizationCandidate candidate(
            long id, String name, String city, String province,
            String placeType, String verificationStatus, boolean recommendable
    ) {
        return new PlaceImportJdbcRepository.ProvinceNormalizationCandidate(
                id, "OSM_GEOFABRIK", "ext-" + id, name,
                province, city, placeType, verificationStatus,
                recommendable, 10.0, 106.0
        );
    }
}
