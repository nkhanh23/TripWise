package com.tripwise.place.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.place.application.dto.PlaceImportRecord;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilter;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilterResult;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceType;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

public class OsmPlaceFilterValidation {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final OsmPlaceFilter FILTER = new OsmPlaceFilter();

    private static final Set<String> CHECK_NAMES = Set.of(
            "Jungle Boss Sales Office",
            "Ba Ngọc - Chuyên cá cảnh",
            "Nguyen Art Gallery",
            "Blue Gallery",
            "CBES Mini Museum",
            "Hoàng Thành Huế",
            "Hầm Thủy Lôi",
            "Mongo Land Dalat",
            "Khu Văn hóa Tâm linh Đà Sơn"
    );

    public static void main(String[] args) throws IOException {
        Path dataFile = Paths.get("data", "vietnam-places.ndjson");
        if (!Files.exists(dataFile)) {
            System.err.println("File not found: " + dataFile.toAbsolutePath());
            System.exit(1);
        }

        List<RecordWithLine> allRecords = new ArrayList<>();
        try (BufferedReader reader = Files.newBufferedReader(dataFile)) {
            String line;
            int lineNum = 0;
            while ((line = reader.readLine()) != null) {
                lineNum++;
                try {
                    RawRecord raw = MAPPER.readValue(line, RawRecord.class);
                    allRecords.add(new RecordWithLine(lineNum, raw));
                } catch (Exception e) {
                    // skip parse errors
                }
            }
        }

        int beforeAttraction80 = 0;
        int afterAttraction80 = 0;
        int demotedByBusiness = 0;
        int demotedByWeakHistoric = 0;
        int demotedByPlaceOfWorship = 0;
        int nonAttractionCount = 0;
        int rejectedCount = 0;

        List<ScoredPlace> autoApproved = new ArrayList<>();
        List<DemotedPlace> demoted = new ArrayList<>();

        // First pass: simulate OLD behavior (strongTourismSignal only, no guard)
        Map<Integer, Boolean> oldAutoApproved = new HashMap<>();
        for (RecordWithLine rwl : allRecords) {
            try {
                PlaceImportRecord record = toPlaceImportRecord(rwl);
                OsmPlaceFilterResult result = FILTER.filter(record);
                boolean wasAutoApproved = !result.isRejected()
                        && result.placeType() == OsmPlaceType.ATTRACTION
                        && result.qualityScore() >= 80
                        && result.strongTourismSignal();
                if (wasAutoApproved) {
                    beforeAttraction80++;
                }
                oldAutoApproved.put(rwl.lineNum, wasAutoApproved);

                // Track NEW behavior
                boolean isNowGuarded = result.isPromotionGuarded();
                boolean isNowAutoApproved = !result.isRejected()
                        && result.placeType() == OsmPlaceType.ATTRACTION
                        && result.qualityScore() >= 80
                        && result.strongTourismSignal()
                        && !isNowGuarded;

                if (isNowAutoApproved) {
                    afterAttraction80++;
                    autoApproved.add(new ScoredPlace(
                            record.name(),
                            result.qualityScore(),
                            result.placeType(),
                            result.strongTourismSignal(),
                            rwl.raw.name()
                    ));
                }

                if (result.placeType() == OsmPlaceType.ATTRACTION && result.qualityScore() >= 80) {
                    if (result.isPromotionGuarded()) {
                        demoted.add(new DemotedPlace(
                                record.name(),
                                result.qualityScore(),
                                result.promotionGuardReason(),
                                rwl.raw.name()
                        ));
                        if (result.promotionGuardReason().contains("Business/office")) {
                            demotedByBusiness++;
                        } else if (result.promotionGuardReason().contains("Weak historic")) {
                            demotedByWeakHistoric++;
                        } else if (result.promotionGuardReason().contains("Place of worship")) {
                            demotedByPlaceOfWorship++;
                        }
                    }
                }

                if (result.isRejected()) {
                    rejectedCount++;
                } else if (result.placeType() != OsmPlaceType.ATTRACTION) {
                    nonAttractionCount++;
                }

            } catch (Exception ignored) {
            }
        }

        // Sort
        autoApproved.sort((a, b) -> Integer.compare(b.score, a.score));
        demoted.sort((a, b) -> Integer.compare(b.score, a.score));

        System.out.println("=== SAMPLE VALIDATION REPORT ===");
        System.out.println("Total records parsed: " + allRecords.size());
        System.out.println("Rejected: " + rejectedCount);
        System.out.println("Non-ATTRACTION (FOOD/HOTEL/SERVICE): " + nonAttractionCount);
        System.out.println();
        System.out.println("Before hardening (old logic): " + beforeAttraction80 + " ATTRACTION >=80");
        System.out.println("After hardening (new logic):  " + afterAttraction80 + " ATTRACTION AUTO_APPROVED");
        System.out.println();
        System.out.println("Demoted by business keyword guard: " + demotedByBusiness);
        System.out.println("Demoted by weak historic guard: " + demotedByWeakHistoric);
        System.out.println("Demoted by place of worship guard: " + demotedByPlaceOfWorship);
        System.out.println("Total demoted: " + demoted.size());
        System.out.println();

        System.out.println("=== TOP 30 AUTO_APPROVED (after hardening) ===");
        System.out.printf("%-4s %-50s %s%n", "#", "Name", "Score");
        int rank = 1;
        for (ScoredPlace p : autoApproved.subList(0, Math.min(30, autoApproved.size()))) {
            System.out.printf("%-4d %-50s %d%n", rank, truncate(p.name, 48), p.score);
            rank++;
        }
        System.out.println();

        System.out.println("=== TOP 30 DEMOTED (with reason) ===");
        System.out.printf("%-4s %-45s %s %s%n", "#", "Name", "Score", "Reason");
        rank = 1;
        for (DemotedPlace p : demoted.subList(0, Math.min(30, demoted.size()))) {
            System.out.printf("%-4d %-45s %3d %s%n", rank, truncate(p.name, 43), p.score, p.reason);
            rank++;
        }
        System.out.println();

        System.out.println("=== SPECIFIC RECORDS CHECK ===");
        for (RecordWithLine rwl : allRecords) {
            String name = rwl.raw.name;
            if (name != null) {
                String normalizedName = normalizeName(name);
                boolean matched = CHECK_NAMES.stream()
                        .anyMatch(cn -> normalizedName.contains(normalizeName(cn)));
                if (matched) {
                    try {
                        PlaceImportRecord record = toPlaceImportRecord(rwl);
                        OsmPlaceFilterResult result = FILTER.filter(record);
                        System.out.printf("%-40s | type=%-12s | score=%-3d | strongSig=%-5b | guard=%-40s%n",
                                truncate(name, 38),
                                result.placeType(),
                                result.qualityScore(),
                                result.strongTourismSignal(),
                                result.promotionGuardReason() != null ? result.promotionGuardReason() : "None");
                    } catch (Exception ignored) {
                    }
                }
            }
        }
    }

    private static String normalizeName(String name) {
        if (name == null) return "";
        return java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return "";
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }

    private static PlaceImportRecord toPlaceImportRecord(RecordWithLine rwl) {
        RawRecord raw = rwl.raw;
        return new PlaceImportRecord(
                raw.sourceExternalId,
                raw.name,
                raw.province,
                raw.city,
                raw.district,
                raw.ward,
                raw.displayAddress,
                null,
                raw.latitude,
                raw.longitude,
                null,
                null,
                60,
                false,
                true,
                null,
                raw.verificationStatus != null ? raw.verificationStatus : "PENDING",
                new LinkedHashSet<>(),
                raw.rawTags != null ? raw.rawTags : Map.of()
        );
    }

    private record RecordWithLine(int lineNum, RawRecord raw) {}

    private record RawRecord(
            String sourceExternalId,
            String name,
            String province,
            String city,
            String district,
            String ward,
            String displayAddress,
            Double latitude,
            Double longitude,
            Boolean active,
            String verificationStatus,
            Map<String, String> rawTags
    ) {}

    private record ScoredPlace(String name, int score, OsmPlaceType type, boolean strongSignal, String rawName) {}

    private record DemotedPlace(String name, int score, String reason, String rawName) {}
}
