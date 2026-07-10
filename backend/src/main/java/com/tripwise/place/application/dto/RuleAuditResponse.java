package com.tripwise.place.application.dto;

import java.util.List;

public class RuleAuditResponse {

    private OverallSection overall;
    private List<RuleBreakdown> breakdownByRule;
    private List<PlaceTypeDraftBreakdown> breakdownByPlaceTypeDraft;
    private List<CategoryBreakdown> breakdownByCategory;
    private List<SourceBreakdown> breakdownBySource;
    private List<RuleCategoryMatrixItem> ruleCategoryMatrix;
    private List<Recommendation> recommendations;
    private String province;
    private String city;

    public RuleAuditResponse() {}

    public RuleAuditResponse(OverallSection overall, List<RuleBreakdown> breakdownByRule,
                             List<PlaceTypeDraftBreakdown> breakdownByPlaceTypeDraft,
                             List<CategoryBreakdown> breakdownByCategory,
                             List<SourceBreakdown> breakdownBySource,
                             List<RuleCategoryMatrixItem> ruleCategoryMatrix,
                             List<Recommendation> recommendations,
                             String province, String city) {
        this.overall = overall;
        this.breakdownByRule = breakdownByRule;
        this.breakdownByPlaceTypeDraft = breakdownByPlaceTypeDraft;
        this.breakdownByCategory = breakdownByCategory;
        this.breakdownBySource = breakdownBySource;
        this.ruleCategoryMatrix = ruleCategoryMatrix;
        this.recommendations = recommendations;
        this.province = province;
        this.city = city;
    }

    public OverallSection getOverall() { return overall; }
    public List<RuleBreakdown> getBreakdownByRule() { return breakdownByRule; }
    public List<PlaceTypeDraftBreakdown> getBreakdownByPlaceTypeDraft() { return breakdownByPlaceTypeDraft; }
    public List<CategoryBreakdown> getBreakdownByCategory() { return breakdownByCategory; }
    public List<SourceBreakdown> getBreakdownBySource() { return breakdownBySource; }
    public List<RuleCategoryMatrixItem> getRuleCategoryMatrix() { return ruleCategoryMatrix; }
    public List<Recommendation> getRecommendations() { return recommendations; }
    public String getProvince() { return province; }
    public String getCity() { return city; }

    public void setOverall(OverallSection overall) { this.overall = overall; }
    public void setBreakdownByRule(List<RuleBreakdown> breakdownByRule) { this.breakdownByRule = breakdownByRule; }
    public void setBreakdownByPlaceTypeDraft(List<PlaceTypeDraftBreakdown> breakdownByPlaceTypeDraft) { this.breakdownByPlaceTypeDraft = breakdownByPlaceTypeDraft; }
    public void setBreakdownByCategory(List<CategoryBreakdown> breakdownByCategory) { this.breakdownByCategory = breakdownByCategory; }
    public void setBreakdownBySource(List<SourceBreakdown> breakdownBySource) { this.breakdownBySource = breakdownBySource; }
    public void setRuleCategoryMatrix(List<RuleCategoryMatrixItem> ruleCategoryMatrix) { this.ruleCategoryMatrix = ruleCategoryMatrix; }
    public void setRecommendations(List<Recommendation> recommendations) { this.recommendations = recommendations; }
    public void setProvince(String province) { this.province = province; }
    public void setCity(String city) { this.city = city; }

    public static class OverallSection {
        private int totalStaging;
        private int autoApprove;
        private int autoDuplicate;
        private int autoReject;
        private int adminReview;

        public OverallSection() {}

        public OverallSection(int totalStaging, int autoApprove, int autoDuplicate, int autoReject, int adminReview) {
            this.totalStaging = totalStaging;
            this.autoApprove = autoApprove;
            this.autoDuplicate = autoDuplicate;
            this.autoReject = autoReject;
            this.adminReview = adminReview;
        }

        public int getTotalStaging() { return totalStaging; }
        public int getAutoApprove() { return autoApprove; }
        public int getAutoDuplicate() { return autoDuplicate; }
        public int getAutoReject() { return autoReject; }
        public int getAdminReview() { return adminReview; }
    }

    public static class RuleBreakdown {
        private String rule;
        private int count;

        public RuleBreakdown() {}

        public RuleBreakdown(String rule, int count) {
            this.rule = rule;
            this.count = count;
        }

        public String getRule() { return rule; }
        public int getCount() { return count; }
    }

    public static class PlaceTypeDraftBreakdown {
        private String placeTypeDraft;
        private int count;

        public PlaceTypeDraftBreakdown() {}

        public PlaceTypeDraftBreakdown(String placeTypeDraft, int count) {
            this.placeTypeDraft = placeTypeDraft;
            this.count = count;
        }

        public String getPlaceTypeDraft() { return placeTypeDraft; }
        public int getCount() { return count; }
    }

    public static class CategoryBreakdown {
        private String category;
        private int count;

        public CategoryBreakdown() {}

        public CategoryBreakdown(String category, int count) {
            this.category = category;
            this.count = count;
        }

        public String getCategory() { return category; }
        public int getCount() { return count; }
    }

    public static class SourceBreakdown {
        private String source;
        private int count;

        public SourceBreakdown() {}

        public SourceBreakdown(String source, int count) {
            this.source = source;
            this.count = count;
        }

        public String getSource() { return source; }
        public int getCount() { return count; }
    }

    public static class RuleCategoryMatrixItem {
        private String rule;
        private List<CategoryBreakdown> categories;

        public RuleCategoryMatrixItem() {}

        public RuleCategoryMatrixItem(String rule, List<CategoryBreakdown> categories) {
            this.rule = rule;
            this.categories = categories;
        }

        public String getRule() { return rule; }
        public List<CategoryBreakdown> getCategories() { return categories; }
    }

    public static class Recommendation {
        private String category;
        private int count;
        private String recommendation;
        private String reason;

        public Recommendation() {}

        public Recommendation(String category, int count, String recommendation, String reason) {
            this.category = category;
            this.count = count;
            this.recommendation = recommendation;
            this.reason = reason;
        }

        public String getCategory() { return category; }
        public int getCount() { return count; }
        public String getRecommendation() { return recommendation; }
        public String getReason() { return reason; }
    }
}
