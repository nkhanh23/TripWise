package com.tripwise.place.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.tripwise.place.infrastructure.config.PlaceModerationBackfillMode;
import com.tripwise.place.infrastructure.persistence.PlaceImportJdbcRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

@Service
public class PlaceProvinceNormalizationService {

    private static final Logger log = LoggerFactory.getLogger(PlaceProvinceNormalizationService.class);

    private static final Map<String, String> SAFE_CITY_TO_PROVINCE = buildSafeMapping();
    private static final Set<String> SKIPPED_UNSAFE_RAW = Set.of(
            "phường đức thắng", "phường an khánh", "phường vĩnh hưng",
            "phường 3", "phường 7", "phường 17", "phường 25",
            "xã đông thạnh", "xã xuân trường", "xã nhị bình", "xã tân xã",
            "phường long thạnh mỹ", "minh khai", "xuân hòa",
            "miami, fl", "bavet",
            "1", "5", "11"
    );
    private static final Set<String> SKIPPED_UNSAFE_KEYS;

    static {
        SKIPPED_UNSAFE_KEYS = SKIPPED_UNSAFE_RAW.stream()
                .map(PlaceProvinceNormalizationService::normalizeKey)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    private final PlaceImportJdbcRepository repository;
    private final ObjectMapper objectMapper;

    public PlaceProvinceNormalizationService(
            PlaceImportJdbcRepository repository,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    private static Map<String, String> buildSafeMapping() {
        Map<String, String> map = new LinkedHashMap<>();

        map.put("quan phu nhuan", "H\u1ed3 Ch\u00ed Minh");
        map.put("biinh thuy", "C\u1ea7n Th\u01a1");
        map.put("lai vung", "\u0110\u1ed3ng Th\u00e1p");
        map.put("thi tran lai vung", "\u0110\u1ed3ng Th\u00e1p");

        map.put("ho chi minh", "Hồ Chí Minh");
        map.put("ho chi minh city", "Hồ Chí Minh");
        map.put("thanh pho ho chi minh", "Hồ Chí Minh");
        map.put("tp ho chi minh", "Hồ Chí Minh");
        map.put("tphcm", "Hồ Chí Minh");
        map.put("tp hcm", "Hồ Chí Minh");
        map.put("hcm", "Hồ Chí Minh");
        map.put("hcmc", "Hồ Chí Minh");
        map.put("saigon", "Hồ Chí Minh");
        map.put("sai gon", "Hồ Chí Minh");
        map.put("t p hcm", "Hồ Chí Minh");
        map.put("thu duc", "Hồ Chí Minh");
        map.put("thanh pho thu duc", "Hồ Chí Minh");
        map.put("thu duc ho chi minh", "Hồ Chí Minh");
        map.put("binh thanh", "Hồ Chí Minh");
        map.put("quan binh thanh", "Hồ Chí Minh");
        map.put("tan binh", "Hồ Chí Minh");
        map.put("tan phu", "Hồ Chí Minh");
        map.put("phu nhuan", "Hồ Chí Minh");
        map.put("binh tan", "Hồ Chí Minh");
        map.put("binh chanh", "Hồ Chí Minh");
        map.put("cu chi", "Hồ Chí Minh");
        map.put("nha be", "Hồ Chí Minh");
        map.put("go vap", "Hồ Chí Minh");
        map.put("quan go vap", "Hồ Chí Minh");
        map.put("quan 1", "Hồ Chí Minh");
        map.put("quan 3", "Hồ Chí Minh");
        map.put("quan 5", "Hồ Chí Minh");
        map.put("quan 6", "Hồ Chí Minh");
        map.put("quan 7", "Hồ Chí Minh");
        map.put("quan 10", "Hồ Chí Minh");
        map.put("district 1", "Hồ Chí Minh");
        map.put("phuong pham ngu lao q1", "Hồ Chí Minh");
        map.put("phuong 7 quan phu nhuan thanh pho ho chi minh", "Hồ Chí Minh");
        map.put("phuong thao dien", "Hồ Chí Minh");
        map.put("thao dien", "Hồ Chí Minh");
        map.put("xa xuan thoi son", "Hồ Chí Minh");
        map.put("ap 3 phuoc kien nha be ho chi minh city", "Hồ Chí Minh");

        map.put("ha noi", "Hà Nội");
        map.put("hanoi", "Hà Nội");
        map.put("dong da", "Hà Nội");
        map.put("ba dinh", "Hà Nội");
        map.put("hoan kiem", "Hà Nội");
        map.put("tay ho", "Hà Nội");
        map.put("cau giay", "Hà Nội");
        map.put("hai ba trung", "Hà Nội");
        map.put("long bien", "Hà Nội");
        map.put("ha dong", "Hà Nội");
        map.put("thanh xuan", "Hà Nội");
        map.put("hoang mai", "Hà Nội");
        map.put("bac tu liem", "Hà Nội");

        map.put("can tho", "Cần Thơ");
        map.put("ninh kieu", "Cần Thơ");
        map.put("cai rang", "Cần Thơ");
        map.put("binh thuy", "Cần Thơ");
        map.put("o mon", "Cần Thơ");
        map.put("thot not", "Cần Thơ");
        map.put("phong dien", "Cần Thơ");

        map.put("da nang", "Đà Nẵng");
        map.put("danang", "Đà Nẵng");

        map.put("hoi an", "Quảng Nam");
        map.put("tam ky", "Quảng Nam");

        map.put("hai phong", "Hải Phòng");
        map.put("haiphong", "Hải Phòng");
        map.put("thanh pho hai phong", "Hải Phòng");
        map.put("dac khu cat hai", "Hải Phòng");
        map.put("cat ba town", "Hải Phòng");

        map.put("hue", "Thừa Thiên Huế");
        map.put("thua thien hue", "Thừa Thiên Huế");

        map.put("binh thuan", "Bình Thuận");
        map.put("mui ne", "Bình Thuận");
        map.put("mui ne ham tien", "Bình Thuận");
        map.put("mui ne phan thiet", "Bình Thuận");
        map.put("phan thiet", "Bình Thuận");
        map.put("tp phan thiet", "Bình Thuận");

        map.put("phu quoc", "Kiên Giang");
        map.put("thanh pho phu quoc", "Kiên Giang");
        map.put("phu quoc island", "Kiên Giang");
        map.put("duong dong", "Kiên Giang");

        map.put("vung tau", "Bà Rịa - Vũng Tàu");

        map.put("nha trang", "Khánh Hòa");

        map.put("phong nha", "Quảng Bình");
        map.put("quang binh", "Quảng Bình");

        map.put("da lat", "Lâm Đồng");
        map.put("dalat", "Lâm Đồng");
        map.put("thi tran lac duong", "Lâm Đồng");

        map.put("hai duong", "Hải Dương");
        map.put("ben tre", "Bến Tre");
        map.put("tay ninh", "Tây Ninh");
        map.put("binh duong", "Bình Dương");
        map.put("di an binh duong", "Bình Dương");
        map.put("lai thieu", "Bình Dương");
        map.put("kon tum", "Kon Tum");
        map.put("huyen kon plong", "Kon Tum");
        map.put("my tho", "Tiền Giang");
        map.put("bac lieu", "Bạc Liêu");
        map.put("tra vinh", "Trà Vinh");
        map.put("ha tinh", "Hà Tĩnh");
        map.put("tp ha tinh", "Hà Tĩnh");
        map.put("bac ninh", "Bắc Ninh");
        map.put("phan rang thap cham", "Ninh Thuận");
        map.put("soc trang", "Sóc Trăng");
        map.put("meo vac", "Hà Giang");
        map.put("quy nhon", "Bình Định");
        map.put("vu ban", "Nam Định");
        map.put("phuong nam dinh", "Nam Định");
        map.put("tam coc ninh binh", "Ninh Bình");
        map.put("huyen lap vo", "Đồng Tháp");
        map.put("thi tran hau nghia", "Long An");
        map.put("thai nguyen", "Thái Nguyên");
        map.put("thai ngyen", "Thái Nguyên");
        map.put("ea drang", "Đắk Lắk");
        map.put("ea knop", "Đắk Lắk");
        map.put("quang ninh", "Quảng Ninh");
        map.put("ha long", "Quảng Ninh");

        return Map.copyOf(map);
    }

    static String normalizeKey(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return Normalizer.normalize(value.trim(), Normalizer.Form.NFKD)
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replaceAll("[^a-z0-9]+", " ")
                .trim()
                .replaceAll("\\s+", " ");
    }

    static String resolveProvince(String city) {
        if (city == null || city.isBlank()) {
            return null;
        }
        String key = normalizeKey(city);
        if (key.isEmpty()) {
            return null;
        }
        return SAFE_CITY_TO_PROVINCE.get(key);
    }

    static boolean isUnsafe(String city) {
        if (city == null || city.isBlank()) {
            return false;
        }
        String key = normalizeKey(city);
        return SKIPPED_UNSAFE_KEYS.contains(key);
    }

    public ProvinceNormalizationReport runDryRun(String sourceName, int sampleLimit) {
        return runNormalization(sourceName, sampleLimit, false);
    }

    @Transactional
    public ProvinceNormalizationReport runApply(String sourceName, int sampleLimit) {
        if (!"OSM_GEOFABRIK".equals(sourceName)) {
            throw new IllegalStateException("APPLY mode is restricted to source=OSM_GEOFABRIK");
        }
        return runNormalization(sourceName, sampleLimit, true);
    }

    private ProvinceNormalizationReport runNormalization(String sourceName, int sampleLimit, boolean applyChanges) {
        List<PlaceImportJdbcRepository.ProvinceNormalizationCandidate> candidates =
                repository.findProvinceNullCandidates();

        int totalCandidates = candidates.size();
        int wouldNormalize = 0;
        int skippedUnsafe = 0;
        int skippedUnknownCity = 0;
        int publicAffected = 0;

        Map<String, Long> byTargetProvince = new TreeMap<>();
        Map<String, Long> byPlaceType = new LinkedHashMap<>();
        Map<String, Long> byVerificationStatus = new LinkedHashMap<>();
        List<NormalizationSample> samples = new ArrayList<>();
        List<PlaceImportJdbcRepository.ProvinceUpdateCommand> pendingUpdates = new ArrayList<>();

        for (PlaceImportJdbcRepository.ProvinceNormalizationCandidate candidate : candidates) {
            String city = candidate.city();
            String province = resolveProvince(city);

            if (province == null) {
                skippedUnsafe++;
                continue;
            }

            wouldNormalize++;
            byTargetProvince.merge(province, 1L, Long::sum);
            byPlaceType.merge(
                    candidate.placeType() != null ? candidate.placeType() : "UNKNOWN",
                    1L, Long::sum
            );
            byVerificationStatus.merge(
                    candidate.verificationStatus() != null ? candidate.verificationStatus() : "UNKNOWN",
                    1L, Long::sum
            );

            boolean isPublic = "AUTO_APPROVED".equals(candidate.verificationStatus())
                    || "VERIFIED".equals(candidate.verificationStatus());
            if (isPublic && Boolean.TRUE.equals(candidate.recommendable())) {
                publicAffected++;
            }

            if (samples.size() < sampleLimit) {
                samples.add(new NormalizationSample(
                        candidate.id(),
                        candidate.name(),
                        candidate.placeType(),
                        city,
                        candidate.province(),
                        province,
                        candidate.verificationStatus(),
                        candidate.recommendable()
                ));
            }

            if (applyChanges) {
                pendingUpdates.add(new PlaceImportJdbcRepository.ProvinceUpdateCommand(
                        candidate.id(), province
                ));
            }
        }

        int updatedCount = 0;
        boolean noDbUpdateExecuted = true;
        if (applyChanges && !pendingUpdates.isEmpty()) {
            updatedCount = repository.updateProvinceBatch(sourceName, pendingUpdates);
            noDbUpdateExecuted = false;
        }

        return new ProvinceNormalizationReport(
                applyChanges ? "APPLY" : "DRY_RUN",
                sourceName,
                totalCandidates,
                wouldNormalize,
                skippedUnsafe,
                skippedUnknownCity,
                publicAffected,
                updatedCount,
                noDbUpdateExecuted,
                byTargetProvince,
                byPlaceType,
                byVerificationStatus,
                samples
        );
    }

    public void writeReportJson(Path outputPath, ProvinceNormalizationReport report) {
        try {
            Path parent = outputPath.toAbsolutePath().normalize().getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            String payload = objectMapper.copy()
                    .enable(SerializationFeature.INDENT_OUTPUT)
                    .writeValueAsString(report);
            Files.writeString(outputPath, payload, StandardCharsets.UTF_8);
            log.info("Wrote province normalization report to {}", outputPath);
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Failed to write province normalization report to " + outputPath, exception);
        }
    }

    public String formatReport(ProvinceNormalizationReport report) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== PROVINCE NORMALIZATION REPORT ===\n");
        sb.append("executionMode=").append(report.executionMode()).append('\n');
        sb.append("sourceName=").append(report.sourceName()).append('\n');
        sb.append("totalCandidates=").append(report.totalCandidates()).append('\n');
        sb.append("wouldNormalize=").append(report.wouldNormalize()).append('\n');
        sb.append("skippedUnsafe=").append(report.skippedUnsafe()).append('\n');
        sb.append("skippedUnknownCity=").append(report.skippedUnknownCity()).append('\n');
        sb.append("publicAffected=").append(report.publicAffected()).append('\n');
        sb.append("updatedCount=").append(report.updatedCount()).append('\n');
        sb.append("noDbUpdateExecuted=").append(report.noDbUpdateExecuted()).append('\n');

        sb.append("\nbyTargetProvince:\n");
        report.byTargetProvince().forEach((province, count) ->
                sb.append("  - ").append(province).append(": ").append(count).append('\n'));

        sb.append("\nbyPlaceType:\n");
        report.byPlaceType().forEach((type, count) ->
                sb.append("  - ").append(type).append(": ").append(count).append('\n'));

        sb.append("\nbyVerificationStatus:\n");
        report.byVerificationStatus().forEach((status, count) ->
                sb.append("  - ").append(status).append(": ").append(count).append('\n'));

        sb.append("\nsamples (").append(report.samples().size()).append(" records):\n");
        for (NormalizationSample sample : report.samples()) {
            sb.append("  - id=").append(sample.id())
                    .append(", name=").append(sample.name())
                    .append(", placeType=").append(sample.placeType())
                    .append(", city=").append(sample.city())
                    .append(", oldProvince=").append(sample.oldProvince())
                    .append(", predictedProvince=").append(sample.predictedProvince())
                    .append(", verificationStatus=").append(sample.verificationStatus())
                    .append(", recommendable=").append(sample.recommendable())
                    .append('\n');
        }
        return sb.toString();
    }

    public record ProvinceNormalizationReport(
            String executionMode,
            String sourceName,
            int totalCandidates,
            int wouldNormalize,
            int skippedUnsafe,
            int skippedUnknownCity,
            int publicAffected,
            int updatedCount,
            boolean noDbUpdateExecuted,
            Map<String, Long> byTargetProvince,
            Map<String, Long> byPlaceType,
            Map<String, Long> byVerificationStatus,
            List<NormalizationSample> samples
    ) {
    }

    public record NormalizationSample(
            long id,
            String name,
            String placeType,
            String city,
            String oldProvince,
            String predictedProvince,
            String verificationStatus,
            Boolean recommendable
    ) {
    }
}
