package br.com.dosecerta.dose.certa.config;
import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
import br.com.dosecerta.dose.certa.entity.Usuario;
import br.com.dosecerta.dose.certa.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
@Component
public class BootstrapAdminRunner implements ApplicationRunner {
    private static final Logger log=LoggerFactory.getLogger(BootstrapAdminRunner.class);
    private final UsuarioRepository repo; private final PasswordEncoder encoder;
    private final boolean enabled; private final String login; private final String password;
    public BootstrapAdminRunner(UsuarioRepository repo, PasswordEncoder encoder,
      @Value("#{environment.getProperty('APP_BOOTSTRAP_ADMIN_ENABLED','false')}") boolean enabled,
      @Value("#{environment.getProperty('APP_BOOTSTRAP_ADMIN_LOGIN','')}") String login,
      @Value("#{environment.getProperty('APP_BOOTSTRAP_ADMIN_PASSWORD','')}") String password) {
        this.repo=repo; this.encoder=encoder; this.enabled=enabled; this.login=login; this.password=password;
    }
    @Override public void run(ApplicationArguments args) {
        if (!enabled) return;
        if (repo.count()>0) { log.info("Bootstrap admin skipped: users already exist."); return; }
        if (login==null || login.isBlank()) throw new IllegalStateException("APP_BOOTSTRAP_ADMIN_LOGIN is required.");
        if (password==null || password.length()<12) throw new IllegalStateException("APP_BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.");
        Usuario admin=new Usuario(); admin.setLogin(login.trim()); admin.setSenha(encoder.encode(password)); admin.setPerfil(PerfilUsuario.ADMIN);
        repo.save(admin); log.warn("Initial administrator created. Disable bootstrap and remove credentials from Render now.");
    }
}
