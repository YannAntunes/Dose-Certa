package br.com.dosecerta.dose.certa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = "br.com.dosecerta")
public class DoseCertaApplication {

    public static void main(String[] args) {
        SpringApplication.run(DoseCertaApplication.class, args);
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.boot.ApplicationRunner databaseFixRunner(
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate,
            br.com.dosecerta.dose.certa.repository.UsuarioRepository usuarioRepository,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder
    ) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE consultas ALTER COLUMN observacoes TYPE TEXT");
                System.out.println("✅ Tabela consultas corrigida com sucesso (observacoes -> TEXT)");
            } catch (Exception e) {
                System.out.println("⚠️ Tabela consultas já está corrigida ou não existe.");
            }

            // Migrar senhas existentes para BCrypt
            var usuarios = usuarioRepository.findAll();
            for (var u : usuarios) {
                if (!u.getSenha().startsWith("$2a$")) {
                    u.setSenha(passwordEncoder.encode(u.getSenha()));
                    usuarioRepository.save(u);
                    System.out.println("✅ Senha do usuário " + u.getLogin() + " foi migrada para BCrypt.");
                }
            }
        };
    }
}
