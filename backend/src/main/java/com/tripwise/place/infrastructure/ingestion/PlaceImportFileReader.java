package com.tripwise.place.infrastructure.ingestion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.place.application.dto.PlaceImportRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
public class PlaceImportFileReader {

    private final ObjectMapper objectMapper;

    public void read(Path path, Consumer<PlaceImportRecord> consumer) throws IOException {
        String fileName = path.getFileName().toString().toLowerCase();
        if (fileName.endsWith(".ndjson") || fileName.endsWith(".jsonl")) {
            readNdjson(path, consumer);
            return;
        }

        JsonNode rootNode = objectMapper.readTree(path.toFile());
        if (rootNode == null || rootNode.isNull()) {
            return;
        }

        if (rootNode.isArray()) {
            for (JsonNode itemNode : rootNode) {
                consumer.accept(toRecord(itemNode));
            }
            return;
        }

        if (rootNode.isObject()) {
            consumer.accept(toRecord(rootNode));
            return;
        }

        throw new IllegalArgumentException("Unsupported import payload format for file: " + path);
    }

    private void readNdjson(Path path, Consumer<PlaceImportRecord> consumer) throws IOException {
        try (var lines = Files.lines(path)) {
            Iterator<String> iterator = lines.iterator();
            while (iterator.hasNext()) {
                String line = iterator.next().trim();
                if (line.isEmpty()) {
                    continue;
                }
                consumer.accept(toRecord(objectMapper.readTree(line)));
            }
        }
    }

    private PlaceImportRecord toRecord(JsonNode node) {
        return new PlaceImportRecord(
                text(node, "sourceExternalId"),
                text(node, "name"),
                text(node, "province"),
                text(node, "city"),
                text(node, "district"),
                text(node, "ward"),
                text(node, "displayAddress"),
                text(node, "categorySlug"),
                decimal(node, "latitude"),
                decimal(node, "longitude"),
                text(node, "description"),
                bigDecimal(node, "estimatedCost"),
                integer(node, "durationMinutes"),
                bool(node, "indoor"),
                bool(node, "active"),
                text(node, "priceLevel"),
                text(node, "verificationStatus"),
                tags(node.get("tags")),
                rawTags(node.get("rawTags"))
        );
    }

    private String text(JsonNode node, String fieldName) {
        JsonNode field = node.get(fieldName);
        if (field == null || field.isNull()) {
            return null;
        }
        String value = field.asText().trim();
        return value.isEmpty() ? null : value;
    }

    private Double decimal(JsonNode node, String fieldName) {
        JsonNode field = node.get(fieldName);
        return field == null || field.isNull() ? null : field.asDouble();
    }

    private Integer integer(JsonNode node, String fieldName) {
        JsonNode field = node.get(fieldName);
        return field == null || field.isNull() ? null : field.asInt();
    }

    private Boolean bool(JsonNode node, String fieldName) {
        JsonNode field = node.get(fieldName);
        return field == null || field.isNull() ? null : field.asBoolean();
    }

    private BigDecimal bigDecimal(JsonNode node, String fieldName) {
        JsonNode field = node.get(fieldName);
        return field == null || field.isNull() ? null : field.decimalValue();
    }

    private Set<String> tags(JsonNode node) {
        Set<String> tags = new LinkedHashSet<>();
        if (node != null && node.isArray()) {
            for (JsonNode itemNode : node) {
                String tag = itemNode.asText().trim();
                if (!tag.isEmpty()) {
                    tags.add(tag);
                }
            }
        }
        return tags;
    }

    private Map<String, String> rawTags(JsonNode node) {
        Map<String, String> rawTags = new LinkedHashMap<>();
        if (node != null && node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                String value = entry.getValue() == null || entry.getValue().isNull()
                        ? null
                        : entry.getValue().asText().trim();
                if (value != null && !value.isEmpty()) {
                    rawTags.put(entry.getKey(), value);
                }
            });
        }
        return rawTags;
    }
}
