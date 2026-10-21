package br.com.dosecerta.dose.certa.config;
import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
import br.com.dosecerta.dose.certa.entity.Usuario;
import br.com.dosecerta.dose.certa.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
class BootstrapAdminRunnerTest {
 private final UsuarioRepository repo=mock(UsuarioRepository.class);
 private final PasswordEncoder encoder=mock(PasswordEncoder.class);
 private final DefaultApplicationArguments args=new DefaultApplicationArguments(new String[0]);
 @Test void disabledBootstrapDoesNothing() {
  new BootstrapAdminRunner(repo,encoder,false,"","").run(args); verify(repo,never()).save(any(Usuario.class));
 }
 @Test void createsEncodedAdminOnlyOnEmptyDatabase() {
  when(repo.count()).thenReturn(0L); when(encoder.encode("a-long-test-password")).thenReturn("hash");
  new BootstrapAdminRunner(repo,encoder,true,"first-admin","a-long-test-password").run(args);
  org.mockito.ArgumentCaptor<Usuario> c=org.mockito.ArgumentCaptor.forClass(Usuario.class); verify(repo).save(c.capture());
  assertEquals("first-admin",c.getValue().getLogin()); assertEquals("hash",c.getValue().getSenha()); assertEquals(PerfilUsuario.ADMIN,c.getValue().getPerfil());
 }
 @Test void rejectsShortPassword() {
  when(repo.count()).thenReturn(0L); assertThrows(IllegalStateException.class,()->new BootstrapAdminRunner(repo,encoder,true,"admin","short").run(args));
  verify(repo,never()).save(any(Usuario.class));
 }
 @Test void skipsIfUsersAlreadyExist() {
  when(repo.count()).thenReturn(1L); new BootstrapAdminRunner(repo,encoder,true,"admin","a-long-test-password").run(args);
  verify(repo,never()).save(any(Usuario.class));
 }
}
