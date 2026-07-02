package com.tripwise.itinerary.application.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.ai.infrastructure.GeminiClient;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.itinerary.domain.entity.ItineraryItem;
import com.tripwise.itinerary.infrastructure.persistence.repository.ItineraryItemRepository;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.trip.domain.entity.Trip;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GenerateDescriptionUseCase {

    private static final int MAX_DESCRIPTION_LENGTH = 220;

    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;
    private final ItineraryItemRepository itineraryItemRepository;

    public void execute(Trip trip, List<ItineraryDay> itineraryDays) {
        if (trip == null || itineraryDays == null || itineraryDays.isEmpty()) {
            return;
        }

        List<ItineraryItem> items = itineraryDays.stream()
                .flatMap(day -> day.getItems().stream())
                .toList();

        if (items.isEmpty()) {
            return;
        }

        try {
            List<AiDescriptionResult> descriptions = parseDescriptions(buildPrompt(trip, itineraryDays));
            Map<String, String> descriptionMap = descriptions.stream()
                    .filter(this::isValidDescription)
                    .collect(Collectors.toMap(
                            result -> key(result.getDayNumber(), result.getOrderIndex()),
                            result -> result.getAiDescription().trim(),
                            (left, right) -> left,
                            HashMap::new
                    ));

            for (ItineraryDay day : itineraryDays) {
                for (ItineraryItem item : day.getItems()) {
                    String aiDescription = descriptionMap.get(key(day.getDayNumber(), item.getOrderIndex()));
                    if (aiDescription != null) {
                        item.setAiDescription(aiDescription);
                    }
                }
            }

            List<ItineraryItem> itemsToPersist = items.stream()
                    .filter(item -> item.getAiDescription() != null && !item.getAiDescription().isBlank())
                    .toList();
            if (!itemsToPersist.isEmpty()) {
                itineraryItemRepository.saveAll(itemsToPersist);
            }
        } catch (Exception ex) {
            log.warn("Skipping AI itinerary descriptions for tripId={} because generation failed: {}",
                    trip.getId(), ex.getMessage());
        }
    }

    private List<AiDescriptionResult> parseDescriptions(String prompt) throws Exception {
        String response = geminiClient.generateContent(prompt);
        String cleanJson = cleanJsonText(response);
        return objectMapper.readValue(cleanJson, new TypeReference<List<AiDescriptionResult>>() {
        });
    }

    private boolean isValidDescription(AiDescriptionResult result) {
        return result != null
                && result.getDayNumber() != null
                && result.getOrderIndex() != null
                && result.getAiDescription() != null
                && !result.getAiDescription().isBlank()
                && result.getAiDescription().length() <= MAX_DESCRIPTION_LENGTH;
    }

    private String buildPrompt(Trip trip, List<ItineraryDay> itineraryDays) {
        String interests = trip.getInterests() == null ? "" : String.join(", ", trip.getInterests());

        String itineraryLines = itineraryDays.stream()
                .flatMap(day -> day.getItems().stream().map(item -> formatItem(day, item)))
                .collect(Collectors.joining("\n"));

        return """
                Bạn là trợ lý viết mô tả itinerary cho TripWise.
                Nhiệm vụ: với mỗi hoạt động, viết 1 mô tả ngắn bằng tiếng Việt giải thích vì sao địa điểm này phù hợp.

                Quy tắc bắt buộc:
                1. Chỉ dùng dữ liệu được cung cấp bên dưới. Không được bịa địa điểm, tọa độ, lịch sử, dịch vụ, giá hoặc tiện ích không có trong dữ liệu.
                2. Mỗi mô tả tối đa 220 ký tự, tự nhiên, rõ ràng, hữu ích cho người dùng.
                3. Không nhắc tới việc bạn là AI.
                4. Nếu dữ liệu ít, hãy mô tả ngắn dựa trên tag, category, thời điểm, chi phí và reason sẵn có.
                5. Trả về duy nhất JSON array hợp lệ, không markdown, không giải thích thêm.

                JSON schema:
                [
                  {
                    "dayNumber": 1,
                    "orderIndex": 0,
                    "aiDescription": "..."
                  }
                ]

                Thông tin chuyến đi:
                - Điểm đến: %s
                - Số ngày: %d
                - Ngân sách: %s
                - Sở thích: %s
                - Preferences: %s

                Danh sách hoạt động:
                %s
                """.formatted(
                safe(trip.getDestination()),
                trip.getDays() == null ? 0 : trip.getDays(),
                safe(trip.getBudget()),
                safe(interests),
                safe(trip.getPreferences()),
                itineraryLines
        );
    }

    private String formatItem(ItineraryDay day, ItineraryItem item) {
        Place place = item.getPlace();
        String category = place != null && place.getCategory() != null ? safe(place.getCategory().getName()) : "";
        Set<String> tags = place != null && place.getTags() != null ? place.getTags() : Set.of();
        return """
                - dayNumber=%d; orderIndex=%d; placeName=%s; category=%s; timeSlot=%s; reason=%s; description=%s; estimatedCost=%s; tags=%s
                """.formatted(
                day.getDayNumber(),
                item.getOrderIndex(),
                place != null ? safe(place.getName()) : "",
                category,
                item.getTimeSlot() != null ? item.getTimeSlot().name().toLowerCase(Locale.ROOT) : "",
                safe(item.getReason()),
                place != null ? safe(place.getDescription()) : "",
                item.getEstimatedCost() != null ? item.getEstimatedCost().toPlainString() : "0",
                String.join(", ", tags)
        );
    }

    private String cleanJsonText(String jsonText) {
        if (jsonText == null) {
            return "[]";
        }
        String clean = jsonText.trim();
        if (clean.startsWith("```json")) {
            clean = clean.substring(7);
        } else if (clean.startsWith("```")) {
            clean = clean.substring(3);
        }
        if (clean.endsWith("```")) {
            clean = clean.substring(0, clean.length() - 3);
        }
        return clean.trim();
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\n", " ").trim();
    }

    private String key(Integer dayNumber, Integer orderIndex) {
        return dayNumber + ":" + orderIndex;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    static class AiDescriptionResult {
        private Integer dayNumber;
        private Integer orderIndex;
        private String aiDescription;
    }
}
