package com.tripwise.place.infrastructure.persistence.repository;

import com.tripwise.common.infrastructure.persistence.config.JpaAuditConfig;
import com.tripwise.place.domain.entity.PlaceCategory;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
@Import(JpaAuditConfig.class)
@EntityScan(basePackageClasses = PlaceCategory.class)
@EnableJpaRepositories(basePackageClasses = PlaceCategoryRepository.class)
class PlaceCategoryRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private PlaceCategoryRepository placeCategoryRepository;

    @Test
    void shouldFindCategoryBySlug() {
        PlaceCategory category = PlaceCategory.builder()
                .name("Food")
                .slug("food")
                .build();

        entityManager.persistAndFlush(category);

        Optional<PlaceCategory> foundCategory = placeCategoryRepository.findBySlug("food");

        assertThat(foundCategory).isPresent();
        assertThat(foundCategory.get().getName()).isEqualTo("Food");
        assertThat(foundCategory.get().getSlug()).isEqualTo("food");
    }

    @Test
    void shouldReturnFalseWhenSlugDoesNotExist() {
        boolean exists = placeCategoryRepository.existsBySlug("missing");

        assertThat(exists).isFalse();
    }

    @Test
    void shouldReturnCategoriesOrderedByName() {
        entityManager.persist(PlaceCategory.builder().name("Zoo").slug("zoo").build());
        entityManager.persist(PlaceCategory.builder().name("Beach").slug("beach").build());
        entityManager.persist(PlaceCategory.builder().name("Culture").slug("culture").build());
        entityManager.flush();

        List<PlaceCategory> categories = placeCategoryRepository.findAllByOrderByNameAsc();

        assertThat(categories)
                .extracting(PlaceCategory::getName)
                .containsExactly("Beach", "Culture", "Zoo");
    }
}
