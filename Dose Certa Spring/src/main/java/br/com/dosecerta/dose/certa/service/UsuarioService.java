package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.dto.UsuarioRequestDTO;
import br.com.dosecerta.dose.certa.dto.UsuarioResponseDTO;
import br.com.dosecerta.dose.certa.entity.Usuario;
import br.com.dosecerta.dose.certa.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private final UsuarioRepository repository;

    public UsuarioService(UsuarioRepository repository) {
        this.repository = repository;
    }

    public List<UsuarioResponseDTO> listarTodos() {
        return repository.findAll()
                .stream()
                .map(UsuarioResponseDTO::new)
                .collect(Collectors.toList());
    }

    public UsuarioResponseDTO criar(UsuarioRequestDTO dto) {
        if (repository.findByLogin(dto.getLogin()).isPresent()) {
            throw new IllegalArgumentException("Já existe um usuário com o login '" + dto.getLogin() + "'");
        }
        if (dto.getSenha() == null || dto.getSenha().isBlank()) {
            throw new IllegalArgumentException("A senha não pode ser vazia");
        }

        Usuario usuario = new Usuario();
        usuario.setLogin(dto.getLogin());
        usuario.setSenha(dto.getSenha()); // em produção: hash bcrypt
        usuario.setPerfil(dto.getPerfil());

        return new UsuarioResponseDTO(repository.save(usuario));
    }

    public UsuarioResponseDTO atualizar(Long id, UsuarioRequestDTO dto) {
        Usuario usuario = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        // Verifica conflito de login apenas se mudou
        if (!usuario.getLogin().equals(dto.getLogin())) {
            repository.findByLogin(dto.getLogin()).ifPresent(u -> {
                throw new IllegalArgumentException("Login '" + dto.getLogin() + "' já está em uso");
            });
        }

        usuario.setLogin(dto.getLogin());
        usuario.setPerfil(dto.getPerfil());

        // Só atualiza senha se foi fornecida
        if (dto.getSenha() != null && !dto.getSenha().isBlank()) {
            usuario.setSenha(dto.getSenha());
        }

        return new UsuarioResponseDTO(repository.save(usuario));
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Usuário não encontrado");
        }
        repository.deleteById(id);
    }
}
