package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.controller.RateLimitExceededException;
import br.com.dosecerta.dose.certa.dto.AprovacaoUsuarioRequestDTO;
import br.com.dosecerta.dose.certa.dto.RegistroPublicoRequestDTO;
import br.com.dosecerta.dose.certa.dto.UsuarioRequestDTO;
import br.com.dosecerta.dose.certa.dto.UsuarioResponseDTO;
import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
import br.com.dosecerta.dose.certa.entity.StatusUsuario;
import br.com.dosecerta.dose.certa.entity.Usuario;
import br.com.dosecerta.dose.certa.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private static final Pattern LOGIN_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{3,50}$");
    private static final int MAX_PUBLIC_REGISTRATIONS_PER_WINDOW = 5;
    private static final long RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000L; // 10 minutos

    private final UsuarioRepository repository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final Map<String, Deque<Long>> rateLimitBuckets = new ConcurrentHashMap<>();

    public UsuarioService(UsuarioRepository repository, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UsuarioResponseDTO> listarTodos() {
        return repository.findAll()
                .stream()
                .map(UsuarioResponseDTO::new)
                .collect(Collectors.toList());
    }

    public UsuarioResponseDTO criar(UsuarioRequestDTO dto) {
        String login = dto.getLogin() != null ? dto.getLogin().trim() : "";
        if (login.isEmpty()) {
            throw new IllegalArgumentException("O login não pode ser vazio");
        }
        if (repository.findByLogin(login).isPresent() || repository.findByLoginIgnoreCase(login).isPresent()) {
            throw new IllegalArgumentException("Já existe um usuário com o login '" + login + "'");
        }
        if (dto.getSenha() == null || dto.getSenha().isBlank()) {
            throw new IllegalArgumentException("A senha não pode ser vazia");
        }
        if (dto.getPerfil() == null) {
            throw new IllegalArgumentException("O perfil de acesso é obrigatório");
        }

        Usuario usuario = new Usuario();
        usuario.setLogin(login);
        usuario.setSenha(passwordEncoder.encode(dto.getSenha()));
        usuario.setPerfil(dto.getPerfil());
        usuario.setStatus(dto.getStatus() != null ? dto.getStatus() : StatusUsuario.ATIVO);
        usuario.setCriadoEm(LocalDateTime.now());

        return new UsuarioResponseDTO(repository.save(usuario));
    }

    /**
     * Solicitação de cadastro público:
     * - Protegido por rate limit por IP/chave de cliente
     * - Nunca permite autoatribuição de ADMIN
     * - Cria sempre com status PENDENTE até aprovação pelo administrador
     */
    public UsuarioResponseDTO solicitarCadastroPublico(RegistroPublicoRequestDTO dto, String clientKey) {
        verificarRateLimit(clientKey != null && !clientKey.isBlank() ? clientKey : "global");

        String login = dto.getLogin() != null ? dto.getLogin().trim() : "";
        if (!LOGIN_PATTERN.matcher(login).matches()) {
            throw new IllegalArgumentException("O login deve conter entre 3 e 50 caracteres (apenas letras, números, ponto, hífen ou sublinhado).");
        }

        if (dto.getPerfilSolicitado() == PerfilUsuario.ADMIN) {
            throw new IllegalArgumentException("Não é permitido solicitar perfil de Administrador no cadastro público.");
        }

        if (repository.findByLogin(login).isPresent() || repository.findByLoginIgnoreCase(login).isPresent()) {
            throw new IllegalArgumentException("Já existe um usuário ou solicitação com o login '" + login + "'.");
        }

        validarSenhaForte(dto.getSenha());

        PerfilUsuario perfilSolicitado = dto.getPerfilSolicitado() != null
                ? dto.getPerfilSolicitado()
                : PerfilUsuario.RECEPCAO;

        Usuario usuario = new Usuario();
        usuario.setLogin(login);
        usuario.setSenha(passwordEncoder.encode(dto.getSenha()));
        // Define perfil base mínimo e mantém status PENDENTE até aprovação de um ADMIN
        usuario.setPerfil(perfilSolicitado);
        usuario.setPerfilSolicitado(perfilSolicitado);
        usuario.setStatus(StatusUsuario.PENDENTE);
        usuario.setCriadoEm(LocalDateTime.now());

        return new UsuarioResponseDTO(repository.save(usuario));
    }

    public UsuarioResponseDTO aprovar(Long id, AprovacaoUsuarioRequestDTO dto) {
        Usuario usuario = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        PerfilUsuario perfilFinal = (dto != null && dto.getPerfil() != null)
                ? dto.getPerfil()
                : (usuario.getPerfilSolicitado() != null ? usuario.getPerfilSolicitado() : usuario.getPerfil());

        if (perfilFinal == null) {
            throw new IllegalArgumentException("O administrador deve definir o perfil do usuário na aprovação.");
        }

        usuario.setPerfil(perfilFinal);
        usuario.setStatus(StatusUsuario.ATIVO);

        return new UsuarioResponseDTO(repository.save(usuario));
    }

    public UsuarioResponseDTO rejeitar(Long id, String adminLogado) {
        return alterarStatus(id, StatusUsuario.REJEITADO, adminLogado);
    }

    public UsuarioResponseDTO alterarStatus(Long id, StatusUsuario novoStatus, String adminLogado) {
        if (novoStatus == null) {
            throw new IllegalArgumentException("O novo status é obrigatório.");
        }

        Usuario usuario = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        if (adminLogado != null && usuario.getLogin().equalsIgnoreCase(adminLogado) && novoStatus != StatusUsuario.ATIVO) {
            throw new IllegalArgumentException("Não é possível desativar ou rejeitar seu próprio usuário administrador.");
        }

        usuario.setStatus(novoStatus);
        return new UsuarioResponseDTO(repository.save(usuario));
    }

    public UsuarioResponseDTO atualizar(Long id, UsuarioRequestDTO dto) {
        Usuario usuario = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        String novoLogin = dto.getLogin() != null ? dto.getLogin().trim() : usuario.getLogin();

        if (!usuario.getLogin().equalsIgnoreCase(novoLogin)) {
            repository.findByLoginIgnoreCase(novoLogin).ifPresent(u -> {
                throw new IllegalArgumentException("Login '" + novoLogin + "' já está em uso");
            });
        }

        usuario.setLogin(novoLogin);
        if (dto.getPerfil() != null) {
            usuario.setPerfil(dto.getPerfil());
        }
        if (dto.getStatus() != null) {
            usuario.setStatus(dto.getStatus());
        }

        if (dto.getSenha() != null && !dto.getSenha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(dto.getSenha()));
        }

        return new UsuarioResponseDTO(repository.save(usuario));
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Usuário não encontrado");
        }
        repository.deleteById(id);
    }

    public void limparRateLimit() {
        rateLimitBuckets.clear();
    }

    private void validarSenhaForte(String senha) {
        if (senha == null || senha.length() < 8) {
            throw new IllegalArgumentException("A senha deve ter pelo menos 8 caracteres.");
        }
        boolean temLetra = senha.chars().anyMatch(Character::isLetter);
        boolean temNumero = senha.chars().anyMatch(Character::isDigit);
        if (!temLetra || !temNumero) {
            throw new IllegalArgumentException("A senha deve conter pelo menos 1 letra e 1 número.");
        }
    }

    private void verificarRateLimit(String key) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = rateLimitBuckets.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());

        synchronized (timestamps) {
            while (!timestamps.isEmpty() && (now - timestamps.peekFirst()) > RATE_LIMIT_WINDOW_MS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= MAX_PUBLIC_REGISTRATIONS_PER_WINDOW) {
                throw new RateLimitExceededException(
                        "Muitas solicitações de cadastro em curto período. Aguarde alguns minutos antes de tentar novamente."
                );
            }
            timestamps.addLast(now);
        }
    }
}
