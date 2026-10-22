package br.com.dosecerta.dose.certa.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/**
 * Executa migrações idempotentes de banco de dados apenas quando explicitamente habilitado
 * (APP_DB_MIGRATE_ON_STARTUP=true), separando migrações de schema do boot normal em produção.
 */
@Component
public class DatabaseMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseMigrationRunner.class);

    private final DataSource dataSource;
    private final boolean migrateOnStartup;

    public DatabaseMigrationRunner(
            DataSource dataSource,
            @Value("${app.db.migrate-on-startup:false}") boolean migrateOnStartup
    ) {
        this.dataSource = dataSource;
        this.migrateOnStartup = migrateOnStartup;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!migrateOnStartup) {
            return;
        }
        try {
            ClassPathResource migrationResource = new ClassPathResource("db/migration/V1__schema_and_usuario_status.sql");
            if (migrationResource.exists()) {
                ResourceDatabasePopulator populator = new ResourceDatabasePopulator(migrationResource);
                populator.setContinueOnError(true);
                populator.execute(dataSource);
                log.info("Migração de schema executada com sucesso.");
            }
        } catch (Exception ex) {
            log.warn("Aviso ao executar migração opcional de banco: {}", ex.getMessage());
        }
    }
}
