package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.PlaceImportRecord;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilter;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilterResult;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceType;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class OsmPlaceFilterTest {

    private final OsmPlaceFilter filter = new OsmPlaceFilter();

    @Test
    void shouldRejectSloganLikeArtworkNames() {
        OsmPlaceFilterResult result = filter.filter(record(
                "\"Chung tay bảo vệ môi trường\"",
                Map.of("tourism", "artwork")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.REJECTED);
        assertThat(result.rejectReason()).contains("slogan");
    }

    @Test
    void shouldRejectDistanceMarkerNames() {
        OsmPlaceFilterResult result = filter.filter(record(
                "0 km",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.REJECTED);
        assertThat(result.rejectReason()).contains("distance marker");
    }

    @Test
    void shouldRejectAddressLikeNames() {
        OsmPlaceFilterResult result = filter.filter(record(
                "04 Nguyễn Huy Tự",
                Map.of("amenity", "restaurant")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.REJECTED);
        assertThat(result.rejectReason()).contains("street address");
    }

    @Test
    void shouldRejectPhoneNumberNames() {
        OsmPlaceFilterResult result = filter.filter(record(
                "0971685111",
                Map.of("amenity", "bar")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.REJECTED);
        assertThat(result.rejectReason()).contains("phone number");
    }

    @Test
    void shouldNotPromoteTemperatureMarketingNameToAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "-162° FROST BINGSU & WAFFLE",
                Map.of("amenity", "ice_cream")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.REJECTED);
        assertThat(result.rejectReason()).contains("temperature");
    }

    @Test
    void shouldClassifyValidTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Thap Ba Po Nagar",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.normalizedCategory()).isEqualTo("check-in");
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.strongTourismSignal()).isFalse();
    }

    @Test
    void shouldClassifyBeachAsAttraction() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Bai Dai Beach",
                Map.of("natural", "beach")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.normalizedCategory()).isEqualTo("beach");
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
    }

    @Test
    void shouldPromoteViewpointAsStrongAttractionEvenWhenSparse() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Hon Chong Viewpoint",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.strongTourismSignal()).isTrue();
    }

    @Test
    void shouldPromoteMuseumAsStrongAttractionEvenWhenSparse() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Bao Tang Bien",
                Map.of("tourism", "museum")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.normalizedCategory()).isEqualTo("culture");
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
    }

    @Test
    void shouldPromoteGalleryAsStrongAttractionEvenWhenSparse() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Tasy Studio",
                Map.of("tourism", "gallery")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.normalizedCategory()).isEqualTo("culture");
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
    }

    @Test
    void shouldPromoteWaterfallAsStrongAttractionEvenWhenSparse() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Suoi Tien Waterfall",
                Map.of("natural", "waterfall")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.normalizedCategory()).isEqualTo("nature");
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
    }

    @Test
    void shouldClassifyRestaurantAsFood() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Bun Cha Ca Co Ba",
                Map.of("amenity", "restaurant")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.FOOD);
        assertThat(result.normalizedCategory()).isEqualTo("food");
    }

    @Test
    void shouldScoreSparseServiceBelowAcceptanceThreshold() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Old Fountain Spot",
                Map.of("amenity", "fountain")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.SERVICE);
        assertThat(result.qualityScore()).isLessThan(50);
    }

    @Test
    void shouldClassifyHotelAsHotel() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Sunrise Hotel Nha Trang",
                Map.of("tourism", "hotel")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.HOTEL);
        assertThat(result.normalizedCategory()).isEqualTo("hotel");
    }

    @Test
    void shouldKeepParkAsPendingCandidateInsteadOfRejecting() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Cong Vien Ven Bien",
                Map.of("leisure", "park")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isBetween(70, 79);
        assertThat(result.strongTourismSignal()).isTrue();
    }

    @Test
    void shouldKeepMemorialBelowAutoApprovedThresholdWhenSparse() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Bia Tuong Niem",
                Map.of("historic", "memorial")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isBetween(50, 79);
        assertThat(result.strongTourismSignal()).isFalse();
    }

    @Test
    void shouldTreatArtworkAsServiceInsteadOfStrongAttraction() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Pho Tuong Nghe Thuat",
                Map.of("tourism", "artwork")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.SERVICE);
        assertThat(result.qualityScore()).isLessThan(50);
    }

    @Test
    void shouldGuardSalesOfficeWithTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Jungle Boss Sales Office",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.promotionGuardReason()).contains("Business/office keyword");
    }

    @Test
    void shouldGuardCaCanhShopWithTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Ba Ngoc - Chuyen ca canh",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.promotionGuardReason()).contains("Business/office keyword");
    }

    @Test
    void shouldGuardTravelAgencyWithTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "ABC Travel Agency",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.promotionGuardReason()).contains("Business/office keyword");
    }

    @Test
    void shouldGuardBookingOfficeWithTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "XYZ Booking Office",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.promotionGuardReason()).contains("Business/office keyword");
    }

    @Test
    void shouldGuardCongTyWithTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Cong ty Du lich ABC",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.promotionGuardReason()).contains("Business/office keyword");
    }

    @Test
    void shouldGuardPhongVeWithTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Phong ve du lich ABC",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.promotionGuardReason()).contains("Business/office keyword");
    }

    @Test
    void shouldNotGuardValidGallery() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Nguyen Art Gallery",
                Map.of("tourism", "gallery")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.strongTourismSignal()).isTrue();
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardBlueGallery() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Blue Gallery",
                Map.of("tourism", "gallery")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.strongTourismSignal()).isTrue();
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardValidMuseum() {
        OsmPlaceFilterResult result = filter.filter(record(
                "CBES Mini Museum",
                Map.of("tourism", "museum")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.strongTourismSignal()).isTrue();
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardBaoTang() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Bao tang Thien Nhien Mo",
                Map.of("tourism", "museum")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.normalizedCategory()).isEqualTo("culture");
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldGuardSparseMemorial() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Bia Tuong Niem Ech",
                Map.of("historic", "memorial")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isBetween(50, 79);
        assertThat(result.strongTourismSignal()).isFalse();
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Weak historic");
    }

    @Test
    void shouldGuardSparseMonument() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Dai Niem",
                Map.of("historic", "monument")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isBetween(50, 79);
        assertThat(result.isPromotionGuarded()).isTrue();
    }

    @Test
    void shouldNotGuardBeachWithValidName() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Bai Dai Beach",
                Map.of("natural", "beach")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardWaterfallWithValidName() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Thac Voi",
                Map.of("natural", "waterfall")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardViewpointWithValidName() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Hon Chong Viewpoint",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldGuardViewpointWithPostOfficeAmenityAndCodeLikeName() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "BPC704R14",
                Map.of("tourism", "viewpoint", "amenity", "post_office")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("post office");
    }

    @Test
    void shouldGuardCodeLikeViewpointNameWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "BPC704R14",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Code-like");
    }

    @Test
    void shouldGuardCrowdWatchingViewpointWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Crowd watching",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardViewOnTheBayWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(record(
                "View on the bay",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardUnnamedViewpointWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Nice view",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardSunriseViewpointWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Scenic view",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardViewpointOnTheRocksWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Viewpoint on the rocks",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardObservationTowerStyleViewpointWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Grasslands observation tower (west)",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardHardToClimbViewpointWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Hard to climb",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardNiceViewViewpointWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Nice view",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardGoodViewViewpointWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Good view",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardBeautifulViewViewpointWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Beautiful view",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardScenicViewViewpointWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Scenic view",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Low-identity viewpoint");
    }

    @Test
    void shouldGuardViewpointWithShelterAmenityWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Dinh Thuong-90 Le Luong",
                Map.of("tourism", "viewpoint", "amenity", "shelter")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("shelter");
    }

    @Test
    void shouldKeepHoCocViewpointAutoApproved() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Hồ Cốc",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldKeepMuiAViewpointAutoApproved() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Mũi A",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldKeepMuiSaViViewpointAutoApproved() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "MÅ©i Sa VÄ©",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardViewpointWithExternalWebsiteTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Unnamed Viewpoint",
                Map.of("tourism", "viewpoint", "website", "https://example.com")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardViewpointWithWikidataTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Sunrise viewpoint",
                Map.of("tourism", "viewpoint", "wikidata", "Q123")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardViewpointWithRealPlaceNameEvenIfEndsWithViewpoint() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Ban Tien Lake Viewpoint",
                Map.of("tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void restaurantShouldStayFoodNotAffectedByGuard() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Nha hang Hai San",
                Map.of("amenity", "restaurant")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.FOOD);
        assertThat(result.qualityScore()).isBetween(50, 79);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void hotelShouldStayHotelNotAffectedByGuard() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Khach San Sunrise",
                Map.of("tourism", "hotel")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.HOTEL);
        assertThat(result.qualityScore()).isBetween(50, 79);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldGuardPlaceOfWorshipWithOnlyGenericTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Chua Linh Ung",
                Map.of("amenity", "place_of_worship", "tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(50);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Place of worship");
    }

    @Test
    void shouldNotGuardPlaceOfWorshipWithSpecificTourismMuseum() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Chua Linh Ung Museum",
                Map.of("amenity", "place_of_worship", "tourism", "museum")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldGuardShopTagRemainsRejected() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Cua Hang ABC",
                Map.of("shop", "general", "name", "Cua Hang ABC")
        ));

        assertThat(result.isRejected()).isTrue();
        assertThat(result.rejectReason()).contains("shop");
    }

    @Test
    void shouldGuardDichVuNamedAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "ABC Dich Vu",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Business/office keyword");
    }

    @Test
    void shouldGuardShowroomNamedAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Xe May Showroom",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isTrue();
    }

    @Test
    void shouldGuardLtdNamedAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "ABC Co., Ltd",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isTrue();
    }

    @Test
    void genericTourismAttractionShouldNotHaveStrongSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Dia Danh Chung",
                Map.of("tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.strongTourismSignal()).isFalse();
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldRejectCasinoAmenity() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Casino ABC",
                Map.of("amenity", "casino")
        ));

        assertThat(result.isRejected()).isTrue();
        assertThat(result.rejectReason()).contains("casino");
    }

    @Test
    void shouldRejectKaraokeAmenity() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Karaoke XYZ",
                Map.of("amenity", "karaoke")
        ));

        assertThat(result.isRejected()).isTrue();
        assertThat(result.rejectReason()).contains("karaoke");
    }

    @Test
    void shouldGuardFerryTerminalAttraction() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Ben Pha ABC",
                Map.of("tourism", "attraction", "amenity", "ferry_terminal")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Ferry terminal");
    }

    @Test
    void shouldGuardMemorialWithGenericTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Tuong Niem Ve Anh Hung",
                Map.of("historic", "memorial", "tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Weak historic");
    }

    @Test
    void shouldNotGuardMemorialWithViewpoint() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Viewpoint Memorial",
                Map.of("historic", "memorial", "tourism", "viewpoint")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardMemorialWithDescription() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Bia Tuong Niem Co Mo Ta",
                Map.of("historic", "memorial", "tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardMemorialWithExternalTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Bia Tuong Niem Co Wikidata",
                Map.of("historic", "memorial", "tourism", "attraction", "wikidata", "Q123")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardMemorialWithNaturalBeach() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Bai Bien Tuong Niem",
                Map.of("historic", "memorial", "natural", "beach")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldRejectCasinoEvenWithTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Can Tho Casino",
                Map.of("tourism", "attraction", "amenity", "casino")
        ));

        assertThat(result.isRejected()).isTrue();
        assertThat(result.rejectReason()).contains("casino");
    }

    @Test
    void shouldRejectKaraokeEvenWithTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Can Tho Karaoke",
                Map.of("tourism", "attraction", "amenity", "karaoke")
        ));

        assertThat(result.isRejected()).isTrue();
        assertThat(result.rejectReason()).contains("karaoke");
    }

    @Test
    void shouldGuardFerryTerminalRegardlessOfTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Ben Pha O Muoi",
                Map.of("tourism", "attraction", "amenity", "ferry_terminal")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Ferry terminal");
    }

    @Test
    void shouldNotGuardMonumentWithMuseumTourism() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Museum Monument",
                Map.of("historic", "monument", "tourism", "museum")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardWaysideShrineWithThemeParkTourism() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Theme Shrine",
                Map.of("historic", "wayside_shrine", "tourism", "theme_park")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardTombWithNaturalWaterfall() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Thac Nuoc Mo",
                Map.of("historic", "tomb", "natural", "waterfall")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldGuardWaysideCrossWithGenericAttractionOnly() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Cross Memorial",
                Map.of("historic", "wayside_cross", "tourism", "attraction")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Weak historic");
    }

    @Test
    void shouldClassifyAmusementArcadeAsService() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Game Center ABC",
                Map.of("leisure", "amusement_arcade")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.SERVICE);
        assertThat(result.qualityScore()).isLessThan(50);
    }

    @Test
    void shouldGuardHelioCenterLikeArcadeWithThemePark() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Trung tam Giai tri Phuc hop Helio Center",
                Map.of("tourism", "theme_park", "leisure", "amusement_arcade")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Amusement arcade");
    }

    @Test
    void shouldGuardArcadeWithTourismAttraction() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Attraction Arcade",
                Map.of("tourism", "attraction", "leisure", "amusement_arcade")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Amusement arcade");
    }

    @Test
    void shouldGuardArcadeEvenWithNaturalBeach() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Bai Bien Co May Game",
                Map.of("natural", "beach", "leisure", "amusement_arcade")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Amusement arcade");
    }

    @Test
    void shouldGuardPhongTrungBayWithoutTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Phong Trung Bay Green Palm",
                Map.of("tourism", "gallery")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Exhibition/showroom");
    }

    @Test
    void shouldNotGuardPhongTrungBayWithTrustSignal() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Phong Trung Bay Green Palm",
                Map.of("tourism", "gallery", "wikidata", "Q123")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardKhuTrungBayMuseum() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Khu Trung bay Toi Ac Chien tranh cua Poltpot",
                Map.of("tourism", "museum")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldGuardCongVienSongHauAsThemeParkWithoutTrust() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Cong vien song Hau",
                Map.of("tourism", "theme_park")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Theme park with generic park name");
    }

    @Test
    void shouldGuardCongVienWithDiacriticsAsThemeParkWithoutTrust() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Công viên sông Hậu",
                Map.of("tourism", "theme_park")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isTrue();
        assertThat(result.promotionGuardReason()).contains("Theme park with generic park name");
    }

    @Test
    void shouldNotGuardFunnyLandAsThemePark() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Khu vui choi giai tri Funny Land",
                Map.of("tourism", "theme_park")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardWaterParkAsThemePark() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Water Park ABC",
                Map.of("tourism", "theme_park")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardExplicitThemePark() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Theme Park ABC",
                Map.of("tourism", "theme_park")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardCongVienNuocAsThemePark() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Cong vien nuoc Dam Sen",
                Map.of("tourism", "theme_park")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardCongVienWithDescriptionAsThemePark() {
        OsmPlaceFilterResult result = filter.filter(record(
                "Cong vien song Hau",
                Map.of("tourism", "theme_park")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    @Test
    void shouldNotGuardCongVienWithWikidataAsThemePark() {
        OsmPlaceFilterResult result = filter.filter(sparseRecord(
                "Cong vien song Hau",
                Map.of("tourism", "theme_park", "wikidata", "Q123")
        ));

        assertThat(result.placeType()).isEqualTo(OsmPlaceType.ATTRACTION);
        assertThat(result.qualityScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.isPromotionGuarded()).isFalse();
    }

    private PlaceImportRecord record(String name, Map<String, String> rawTags) {
        return new PlaceImportRecord(
                "osm/test/1",
                name,
                "Khanh Hoa",
                "Nha Trang",
                null,
                null,
                "Tran Phu, Nha Trang",
                null,
                12.25,
                109.19,
                "Sample place",
                null,
                60,
                false,
                true,
                null,
                "PENDING",
                Set.of(),
                rawTags
        );
    }

    private PlaceImportRecord sparseRecord(String name, Map<String, String> rawTags) {
        return new PlaceImportRecord(
                "osm/test/2",
                name,
                null,
                null,
                null,
                null,
                null,
                null,
                12.25,
                109.19,
                null,
                null,
                60,
                false,
                true,
                null,
                "PENDING",
                Set.of(),
                rawTags
        );
    }
}
