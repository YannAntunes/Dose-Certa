package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.entity.Enfermeiro;
import br.com.dosecerta.dose.certa.repository.EnfermeiroRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EnfermeiroService {

    private final EnfermeiroRepository repository;

    public EnfermeiroService(EnfermeiroRepository repository) {
        this.repository = repository;
    }

    public Enfermeiro salvar(Enfermeiro enfermeiro) {
        if (enfermeiro.getNome() == null || enfermeiro.getNome().isBlank())
            throw new IllegalArgumentException("Nome inválido");

        if (enfermeiro.getCoren() == null || enfermeiro.getCoren().isBlank())
            throw new IllegalArgumentException("COREN inválido");

        if (enfermeiro.getEstado() == null || enfermeiro.getEstado().isBlank())
            throw new IllegalArgumentException("Estado inválido");

        enfermeiro.setEstado(enfermeiro.getEstado().toUpperCase());
        return repository.save(enfermeiro);
    }

    public Enfermeiro atualizar(Long id, Enfermeiro dados) {
        Enfermeiro existente = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Enfermeiro não encontrado"));

        if (dados.getNome() == null || dados.getNome().isBlank())
            throw new IllegalArgumentException("Nome inválido");

        if (dados.getCoren() == null || dados.getCoren().isBlank())
            throw new IllegalArgumentException("COREN inválido");

        if (dados.getEstado() == null || dados.getEstado().isBlank())
            throw new IllegalArgumentException("Estado inválido");

        existente.setNome(dados.getNome());
        existente.setCoren(dados.getCoren());
        existente.setEstado(dados.getEstado().toUpperCase());

        return repository.save(existente);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id))
            throw new IllegalArgumentException("Enfermeiro não encontrado");
        repository.deleteById(id);
    }

    public List<Enfermeiro> listarTodos() {
        return repository.findAll();
    }
}
