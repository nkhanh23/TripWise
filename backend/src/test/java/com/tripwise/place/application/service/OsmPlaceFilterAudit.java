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
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

public class OsmPlaceFilterAudit {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final OsmPlaceFilter FILTER = new OsmPlaceFilter();

    private static final Set<String> CHECK_NAMES = Set.of(
            "Jungle Boss Sales Office",
            "Ba Ngoc - Chuyen ca canh",
            "Nguyen Art Gallery",
            "Blue Gallery",
            "CBES Mini Museum",
            "Hoang Thanh Hue",
            "Ham Thuy Loi",
            "Mongo Land Dalat",
            "Khu Van hoa Tam linh Da Son",
            "Vita Garden Mini-Zoo",
            "Helio Center",
            "Phong Trung Bay Green Palm",
            "Chimi Farm",
            "Thung lung hoa Ho Tay",
            "Nha 48 pho Hang Ngang",
            "Bao Tang Thien Nhien Mo"
    );

    // Suspicious signals for audit classification
    private static final Set<String> SUSPICIOUS_NAME_TOKENS = Set.of(
            "center", "centre", "trung tam", "trung tâm",
            "farm", "mini zoo", "garden",
            "showroom", "gallery",
            "workshop", "studio",
            "phong trung bay", "phòng trưng bày",
            "green", "vita"
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

        // Process all records
        int total = allRecords.size();
        int attractionCount = 0;
        int foodCount = 0;
        int hotelCount = 0;
        int serviceCount = 0;
        int rejectedCount = 0;
        int pendingCount = 0;
        int autoApprovedCount = 0;
        int guardedCount = 0;

        List<DetailedPlace> autoApprovedList = new ArrayList<>();
        List<DetailedPlace> guardedList = new ArrayList<>();
        List<DetailedPlace> pendingList = new ArrayList<>();
        List<DetailedPlace> rejectedList = new ArrayList<>();

        // Breakdown by tag categories for AUTO_APPROVED
        int autoApprovedByTourism = 0;
        int autoApprovedByNatural = 0;
        int autoApprovedByLeisure = 0;
        int autoApprovedByAmenity = 0;
        int autoApprovedByHistoric = 0;

        for (RecordWithLine rwl : allRecords) {
            try {
                PlaceImportRecord record = toPlaceImportRecord(rwl);
                OsmPlaceFilterResult result = FILTER.filter(record);
                DetailedPlace dp = new DetailedPlace(record, result, rwl.raw);

                if (result.isRejected()) {
                    rejectedCount++;
                    rejectedList.add(dp);
                } else if (result.placeType() == OsmPlaceType.FOOD) {
                    foodCount++;
                    pendingList.add(dp);
                } else if (result.placeType() == OsmPlaceType.HOTEL) {
                    hotelCount++;
                    pendingList.add(dp);
                } else if (result.placeType() == OsmPlaceType.SERVICE) {
                    serviceCount++;
                    pendingList.add(dp);
                } else if (result.placeType() == OsmPlaceType.ATTRACTION) {
                    attractionCount++;
                    if (result.isPromotionGuarded()) {
                        guardedCount++;
                        guardedList.add(dp);
                        pendingList.add(dp);
                    } else if (result.qualityScore() >= 80 && result.strongTourismSignal()) {
                        autoApprovedCount++;
                        autoApprovedList.add(dp);

                        // Track signal source
                        Map<String, String> tags = rwl.raw.rawTags != null ? rwl.raw.rawTags : Map.of();
                        if (tags.containsKey("tourism") && Set.of("attraction", "viewpoint", "museum", "gallery", "theme_park", "zoo", "aquarium").contains(tags.get("tourism"))) {
                            autoApprovedByTourism++;
                        } else if (tags.containsKey("natural") && Set.of("beach", "waterfall", "peak", "cave_entrance", "bay").contains(tags.get("natural"))) {
                            autoApprovedByNatural++;
                        } else if (tags.containsKey("leisure") && Set.of("park", "garden", "nature_reserve", "water_park").contains(tags.get("leisure"))) {
                            autoApprovedByLeisure++;
                        } else if (tags.containsKey("amenity") && Set.of("theatre", "arts_centre").contains(tags.get("amenity"))) {
                            autoApprovedByAmenity++;
                        } else if (tags.containsKey("historic") && Set.of("castle", "archaeological_site", "fort", "ruins", "city_gate", "temple", "monastery").contains(tags.get("historic"))) {
                            autoApprovedByHistoric++;
                        }
                    } else {
                        pendingList.add(dp);
                    }
                }
            } catch (Exception ignored) {
            }
        }

        // Sort auto-approved by score desc
        autoApprovedList.sort((a, b) -> Integer.compare(b.result.qualityScore(), a.result.qualityScore()));

        // === REPORT ===
        System.out.println("========================================");
        System.out.println("  OSM ATTRACTION QUALITY AUDIT REPORT");
        System.out.println("========================================");
        System.out.println();

        // Part 1: Validation counts
        System.out.println("=== VALIDATION COUNTS ===");
        System.out.printf("Total records parsed:     %d%n", total);
        System.out.printf("ATTRACTION:               %d%n", attractionCount);
        System.out.printf("  AUTO_APPROVED:          %d%n", autoApprovedCount);
        System.out.printf("  Guarded (demoted):      %d%n", guardedCount);
        System.out.printf("  PENDING (score<80):     %d%n", attractionCount - autoApprovedCount - guardedCount);
        System.out.printf("FOOD:                     %d%n", foodCount);
        System.out.printf("HOTEL:                    %d%n", hotelCount);
        System.out.printf("SERVICE:                  %d%n", serviceCount);
        System.out.printf("REJECTED:                 %d%n", rejectedCount);
        System.out.println();

        System.out.println("=== AUTO_APPROVED BY SIGNAL SOURCE ===");
        System.out.printf("tourism=* (attraction/viewpoint/museum/gallery/etc): %d%n", autoApprovedByTourism);
        System.out.printf("natural=* (beach/waterfall/peak/cave/bay):          %d%n", autoApprovedByNatural);
        System.out.printf("leisure=* (park/garden/nature_reserve/water_park):  %d%n", autoApprovedByLeisure);
        System.out.printf("amenity=* (theatre/arts_centre):                    %d%n", autoApprovedByAmenity);
        System.out.printf("historic=* (castle/fort/ruins/etc):                 %d%n", autoApprovedByHistoric);
        System.out.println();

        // Part 2: Top 100 detailed audit
        System.out.println("=== TOP 100 AUTO_APPROVED (by score) ===");
        System.out.println();
        System.out.printf("%-4s %-48s %-5s %-16s %-10s %-6s %-30s %s%n",
                "#", "Name", "Score", "Category", "Province", "Signal", "Tags Summary", "Trust Signal");
        System.out.println("-".repeat(160));
        int rank = 1;
        for (DetailedPlace dp : autoApprovedList.subList(0, Math.min(100, autoApprovedList.size()))) {
            String name = truncate(dp.record.name(), 46);
            int score = dp.result.qualityScore();
            String cat = truncate(dp.result.normalizedCategory(), 14);
            String province = truncate(dp.raw.province != null ? dp.raw.province : "?", 8);
            String signal = truncate(signalSource(dp.raw.rawTags), 4);
            String tags = truncate(formatTags(dp.raw.rawTags), 28);
            String trust = dp.raw.rawTags != null && (dp.raw.rawTags.containsKey("wikidata") || dp.raw.rawTags.containsKey("wikipedia") || dp.raw.rawTags.containsKey("website")) ? "YES" : "no";
            System.out.printf("%-4d %-48s %-5d %-16s %-10s %-6s %-30s %s%n",
                    rank, name, score, cat, province, signal, tags, trust);
            rank++;
        }
        System.out.println();

        // Part 3: Classification of top 100
        System.out.println("=== TOP 100 CLASSIFICATION ===");
        System.out.println();

        List<AutoApprovedWithMeta> top100 = new ArrayList<>();
        rank = 1;
        for (DetailedPlace dp : autoApprovedList.subList(0, Math.min(100, autoApprovedList.size()))) {
            top100.add(new AutoApprovedWithMeta(rank++, dp, classify(dp)));
        }

        Map<String, List<AutoApprovedWithMeta>> groups = top100.stream()
                .collect(Collectors.groupingBy(a -> a.classification, LinkedHashMap::new, Collectors.toList()));

        System.out.println("### Clearly Good (" + groups.getOrDefault("clearly_good", List.of()).size() + ")");
        for (AutoApprovedWithMeta a : groups.getOrDefault("clearly_good", List.of())) {
            System.out.printf("  #%-3d %-50s (score=%d, cat=%s)%n",
                    a.rank, truncate(a.dp.record.name(), 48), a.dp.result.qualityScore(), a.dp.result.normalizedCategory());
        }
        System.out.println();

        System.out.println("### Likely Good (" + groups.getOrDefault("likely_good", List.of()).size() + ")");
        for (AutoApprovedWithMeta a : groups.getOrDefault("likely_good", List.of())) {
            System.out.printf("  #%-3d %-50s (score=%d, cat=%s)%n",
                    a.rank, truncate(a.dp.record.name(), 48), a.dp.result.qualityScore(), a.dp.result.normalizedCategory());
        }
        System.out.println();

        System.out.println("### Suspicious (" + groups.getOrDefault("suspicious", List.of()).size() + ")");
        for (AutoApprovedWithMeta a : groups.getOrDefault("suspicious", List.of())) {
            String tags = formatTags(a.dp.raw.rawTags);
            System.out.printf("  #%-3d %-50s (score=%d, cat=%s, tags=%s)%n",
                    a.rank, truncate(a.dp.record.name(), 48), a.dp.result.qualityScore(),
                    a.dp.result.normalizedCategory(), truncate(tags, 40));
        }
        System.out.println();

        System.out.println("### Bad (" + groups.getOrDefault("bad", List.of()).size() + ")");
        for (AutoApprovedWithMeta a : groups.getOrDefault("bad", List.of())) {
            String tags = formatTags(a.dp.raw.rawTags);
            System.out.printf("  #%-3d %-50s (score=%d, cat=%s, tags=%s)%n",
                    a.rank, truncate(a.dp.record.name(), 48), a.dp.result.qualityScore(),
                    a.dp.result.normalizedCategory(), truncate(tags, 40));
        }
        System.out.println();

        // Part 4: Patterns analysis
        System.out.println("=== PATTERN ANALYSIS ===");
        System.out.println();

        // Pattern: names with "center/trung tam" etc.
        List<String> centerPattern = findPattern(autoApprovedList, Set.of("center", "centre", "trung tam", "trung tâm"), "center/trung-tam pattern");
        System.out.println("Names with 'center/trung tam' pattern (" + centerPattern.size() + " in top 100):");
        centerPattern.subList(0, Math.min(15, centerPattern.size())).forEach(n -> System.out.println("  - " + n));
        System.out.println();

        List<String> farmPattern = findPattern(autoApprovedList, Set.of("farm", "mini zoo", "mini-zoo", "garden", "vita"), "farm/garden pattern");
        System.out.println("Names with 'farm/minizoo/garden' pattern (" + farmPattern.size() + " in top 100):");
        farmPattern.subList(0, Math.min(15, farmPattern.size())).forEach(n -> System.out.println("  - " + n));
        System.out.println();

        List<String> galleryMuseumPattern = findPattern(autoApprovedList, Set.of("gallery", "galerie", "museum", "bao tang", "bào tàng"), "gallery/museum pattern");
        System.out.println("Names with 'gallery/museum/bao tang' pattern (" + galleryMuseumPattern.size() + " in top 100):");
        galleryMuseumPattern.subList(0, Math.min(20, galleryMuseumPattern.size())).forEach(n -> System.out.println("  - " + n));
        System.out.println();

        List<String> genericPattern = findPattern(autoApprovedList, Set.of("cong vien", "công viên", "park", "quang truong", "quảng trường", "square"), "generic park/square pattern");
        System.out.println("Names with generic 'park/square' pattern (" + genericPattern.size() + " in top 100):");
        genericPattern.subList(0, Math.min(10, genericPattern.size())).forEach(n -> System.out.println("  - " + n));
        System.out.println();

        List<String> phongPattern = findPattern(autoApprovedList, Set.of("phong trung bay", "phòng trưng bày", "trung bay", "trưng bày", "phong", "green palm"), "exhibition/display pattern");
        System.out.println("Names with 'exhibition/display' pattern (" + phongPattern.size() + " in top 100):");
        phongPattern.subList(0, Math.min(10, phongPattern.size())).forEach(n -> System.out.println("  - " + n));
        System.out.println();

        // Specific records check
        System.out.println("=== SPECIFIC RECORDS CHECK ===");
        for (DetailedPlace dp : autoApprovedList) {
            String normalizedName = normalizeName(dp.record.name());
            boolean matched = CHECK_NAMES.stream()
                    .anyMatch(cn -> normalizedName.contains(normalizeName(cn)));
            if (matched) {
                String tags = formatTags(dp.raw.rawTags);
                String trust = dp.raw.rawTags != null && (dp.raw.rawTags.containsKey("wikidata") || dp.raw.rawTags.containsKey("wikipedia") || dp.raw.rawTags.containsKey("website")) ? "YES" : "no";
                System.out.printf("%-45s | score=%-3d | cat=%-12s | signal=%-5b | tags=%-30s | trust=%s%n",
                        truncate(dp.record.name(), 43),
                        dp.result.qualityScore(),
                        dp.result.normalizedCategory(),
                        dp.result.strongTourismSignal(),
                        truncate(tags, 28),
                        trust);
            }
        }

        // Also check guarded demoted for reference
        System.out.println();
        System.out.println("=== GUARDED (DEMOTED) COUNTS ===");
        System.out.println("Total guarded: " + guardedList.size());
        Map<String, Long> guardReasons = guardedList.stream()
                .collect(Collectors.groupingBy(dp -> dp.result.promotionGuardReason() != null ? dp.result.promotionGuardReason() : "unknown", Collectors.counting()));
        guardReasons.forEach((reason, count) -> System.out.printf("  %s: %d%n", reason, count));
        System.out.println();

        // Summary of findings
        System.out.println("=== AUDIT SUMMARY ===");
        System.out.println("Total AUTO_APPROVED: " + autoApprovedCount);
        long clearlyGood = groups.getOrDefault("clearly_good", List.of()).size();
        long likelyGood = groups.getOrDefault("likely_good", List.of()).size();
        long suspicious = groups.getOrDefault("suspicious", List.of()).size();
        long bad = groups.getOrDefault("bad", List.of()).size();
        System.out.println("Top 100 breakdown:");
        System.out.println("  clearly_good:  " + clearlyGood);
        System.out.println("  likely_good:   " + likelyGood);
        System.out.println("  suspicious:    " + suspicious);
        System.out.println("  bad:           " + bad);
    }

    private static String classify(DetailedPlace dp) {
        String name = normalizeName(dp.record.name());
        Map<String, String> tags = dp.raw.rawTags != null ? dp.raw.rawTags : Map.of();
        String cat = dp.result.normalizedCategory();
        String tourism = tags.get("tourism");
        String historic = tags.get("historic");
        String amenity = tags.get("amenity");
        String natural = tags.get("natural");
        String leisure = tags.get("leisure");
        boolean hasTrust = tags.containsKey("wikidata") || tags.containsKey("wikipedia") || tags.containsKey("website")
                || (dp.raw.description != null && !dp.raw.description.isBlank());

        // BAD: clearly not tourist attractions — business leftovers
        if (name.contains("cong ty") || name.contains("company") || name.contains("van phong")
                || name.contains("showroom") || name.contains("nha phan phoi") || name.contains("store")
                || amenity != null && (amenity.contains("karaoke") || amenity.contains("nightclub"))) {
            return "bad";
        }

        // BAD: karaoke, bars, clubs classified as attractions
        if (amenity != null && Set.of("karaoke", "nightclub", "brothel").contains(amenity)) {
            return "bad";
        }
        if (name.contains("karaoke")) {
            return "bad";
        }

        // SUSPICIOUS: tourism=attraction with weak metadata (generic catch-all)
        if ("attraction".equals(tourism) && !hasTrust && natural == null && historic == null && leisure == null) {
            return "suspicious";
        }

        // SUSPICIOUS: tourism=attraction with commercial-sounding name
        if ("attraction".equals(tourism) && !hasTrust) {
            if (name.contains("center") || name.contains("farm") || name.contains("mini") || name.contains("vita")) {
                return "suspicious";
            }
        }

        // SUSPICIOUS: gallery/museum that might be commercial showroom
        if ("gallery".equals(tourism) && !hasTrust && (name.contains("studio") || name.contains("tasy"))) {
            return "suspicious";
        }

        // SUSPICIOUS: exhibition/display names
        if (name.contains("phong trung bay") || name.contains("green palm") || name.contains("trung bay")
                || name.contains("display") || name.contains("exhibition")) {
            return "suspicious";
        }

        // SUSPICIOUS: theme_park with generic no-trust name
        if ("theme_park".equals(tourism) && !hasTrust) {
            return "suspicious";
        }

        // SUSPICIOUS: historic=memorial/monument that slipped into AUTO_APPROVED (shouldn't happen but check)
        if (historic != null && Set.of("memorial", "monument", "tomb", "wayside_shrine", "wayside_cross").contains(historic)) {
            return "suspicious";
        }

        // SUSPICIOUS: check-in with very short/generic name and no trust
        if ("check-in".equals(cat) && name.length() < 8 && !hasTrust) {
            return "suspicious";
        }

        // SUSPICIOUS: zoo without trust
        if ("zoo".equals(tourism) && !hasTrust) {
            return "suspicious";
        }

        // SUSPICIOUS: karaoke/bar/restaurant that became ATTRACTION
        if (amenity != null && Set.of("pub", "bar", "restaurant", "cafe", "fast_food").contains(amenity)) {
            return "bad";
        }

        // --- NOW CLASSIFY AS GOOD ---

        // CLEARLY GOOD: museums, galleries with established names
        if ("culture".equals(cat) && (("museum".equals(tourism) || "gallery".equals(tourism)) && name.length() > 5)) {
            return "clearly_good";
        }

        // CLEARLY GOOD: beach
        if ("beach".equals(cat) || "nature".equals(cat)) {
            return "clearly_good";
        }

        // CLEARLY GOOD: strong historic sites
        if (historic != null && Set.of("castle", "archaeological_site", "fort", "ruins", "city_gate", "temple", "monastery").contains(historic)) {
            return "clearly_good";
        }

        // CLEARLY GOOD: entertainment (theme parks, zoos, aquariums)
        if ("entertainment".equals(cat)) {
            return "clearly_good";
        }

        // CLEARLY GOOD: has wikipedia/wikidata
        if (tags.containsKey("wikidata") || tags.containsKey("wikipedia")) {
            return "clearly_good";
        }

        // LIKELY GOOD: has description or website
        if (hasTrust && "check-in".equals(cat)) {
            return "likely_good";
        }

        // Everything else falls here
        return "likely_good";
    }

    private static boolean tokenBasedCheck(String name, List<String> tokens) {
        String normalized = normalizeName(name);
        return tokens.stream().anyMatch(t -> normalized.contains(normalizeName(t)));
    }

    private static List<String> findPattern(List<DetailedPlace> list, Set<String> keywords, String label) {
        List<String> result = new ArrayList<>();
        for (DetailedPlace dp : list) {
            String normalized = normalizeName(dp.record.name());
            for (String kw : keywords) {
                if (normalized.contains(normalizeName(kw))) {
                    String tags = formatTags(dp.raw.rawTags);
                    result.add(dp.record.name() + " [" + dp.result.normalizedCategory() + ", " + tags + "]");
                    break;
                }
            }
        }
        return result;
    }

    private static String signalSource(Map<String, String> tags) {
        if (tags == null) return "?";
        if (tags.containsKey("tourism")) return "tourism";
        if (tags.containsKey("natural")) return "natural";
        if (tags.containsKey("leisure")) return "leisure";
        if (tags.containsKey("historic")) return "historic";
        if (tags.containsKey("amenity")) return "amenity";
        return "?";
    }

    private static String formatTags(Map<String, String> tags) {
        if (tags == null || tags.isEmpty()) return "";
        return tags.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining(", "));
    }

    private static String normalizeName(String name) {
        if (name == null) return "";
        return Normalizer.normalize(name, Normalizer.Form.NFD)
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
            String sourceExternalId, String name, String province, String city,
            String district, String ward, String displayAddress,
            Double latitude, Double longitude, Boolean active,
            String verificationStatus, Map<String, String> rawTags,
            String description
    ) {}

    private record DetailedPlace(PlaceImportRecord record, OsmPlaceFilterResult result, RawRecord raw) {}

    private record AutoApprovedWithMeta(int rank, DetailedPlace dp, String classification) {}
}