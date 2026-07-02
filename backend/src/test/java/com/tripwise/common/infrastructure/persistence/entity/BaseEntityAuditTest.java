package com.tripwise.common.infrastructure.persistence.entity;

import com.tripwise.common.infrastructure.persistence.config.JpaAuditConfig;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.repository.CrudRepository;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(JpaAuditConfig.class)
@EntityScan(basePackageClasses = BaseEntityAuditTest.DummyAuditEntity.class)
@EnableJpaRepositories(considerNestedRepositories = true)
public class BaseEntityAuditTest {

    @Autowired
    private DummyAuditRepository dummyAuditRepository;

    @Test
    void testAuditingPopulatesCreatedAtAndUpdatedAt() {
        DummyAuditEntity entity = new DummyAuditEntity();
        entity.setName("Test Entity");

        DummyAuditEntity savedEntity = dummyAuditRepository.save(entity);

        assertThat(savedEntity.getId()).isNotNull();
        assertThat(savedEntity.getCreatedAt()).isNotNull();
        assertThat(savedEntity.getUpdatedAt()).isNotNull();
        
        // updatedAt should be populated immediately since it's the first save
    }

    @Entity
    @Table(name = "dummy_audit")
    public static class DummyAuditEntity extends BaseEntity {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        private String name;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    public interface DummyAuditRepository extends CrudRepository<DummyAuditEntity, Long> {
    }
}
