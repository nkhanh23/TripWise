package com.tripwise.place.application.service.simulation;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class AutoModerationRuleEngine {
    private final List<AutoModerationRule> rules;

    public AutoModerationRuleEngine(List<AutoModerationRule> rules) {
        this.rules = rules;
    }

    public EvaluationResult evaluate(StagingPlaceDetailResponse detail) {
        // 1. Evaluate AUTO_REJECT rules
        for (AutoModerationRule rule : rules) {
            if (rule.getCategory() == SimulationCategory.AUTO_REJECT && rule.evaluate(detail)) {
                return new EvaluationResult(SimulationCategory.AUTO_REJECT, rule.getSubCategory(detail));
            }
        }

        // 2. Evaluate AUTO_DUPLICATE rules
        for (AutoModerationRule rule : rules) {
            if (rule.getCategory() == SimulationCategory.AUTO_DUPLICATE && rule.evaluate(detail)) {
                return new EvaluationResult(SimulationCategory.AUTO_DUPLICATE, rule.getSubCategory(detail));
            }
        }

        // 3. Evaluate AUTO_APPROVE rules
        for (AutoModerationRule rule : rules) {
            if (rule.getCategory() == SimulationCategory.AUTO_APPROVE && rule.evaluate(detail)) {
                return new EvaluationResult(SimulationCategory.AUTO_APPROVE, rule.getSubCategory(detail));
            }
        }

        // 4. Default: NEEDS_ADMIN_REVIEW
        for (AutoModerationRule rule : rules) {
            if (rule.getCategory() == SimulationCategory.NEEDS_ADMIN_REVIEW && rule.evaluate(detail)) {
                return new EvaluationResult(SimulationCategory.NEEDS_ADMIN_REVIEW, rule.getSubCategory(detail));
            }
        }

        return new EvaluationResult(SimulationCategory.NEEDS_ADMIN_REVIEW, "Other review reason");
    }

    public record EvaluationResult(SimulationCategory category, String subCategory) {}
}
