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

    public List<Enfermeiro> listarTodos() {
        return repository.findAll();
    }
}
