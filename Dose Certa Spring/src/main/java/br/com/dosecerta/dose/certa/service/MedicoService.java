package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.entity.Medico;
import br.com.dosecerta.dose.certa.repository.MedicoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MedicoService {

    private final MedicoRepository repository;

    public MedicoService(MedicoRepository repository) {
        this.repository = repository;
    }

    public Medico salvar(Medico medico) {
        if (medico.getNome() == null || medico.getNome().isBlank())
            throw new IllegalArgumentException("Nome inválido");

        if (medico.getCrm() == null || medico.getCrm() <= 0)
            throw new IllegalArgumentException("CRM inválido");

        if (medico.getEstado() == null || medico.getEstado().isBlank())
            throw new IllegalArgumentException("Estado inválido");

        medico.setEstado(medico.getEstado().toUpperCase());
        return repository.save(medico);
    }

    public Medico atualizar(Long id, Medico dados) {
        Medico existente = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Médico não encontrado"));

        if (dados.getNome() == null || dados.getNome().isBlank())
            throw new IllegalArgumentException("Nome inválido");

        if (dados.getCrm() == null || dados.getCrm() <= 0)
            throw new IllegalArgumentException("CRM inválido");

        if (dados.getEstado() == null || dados.getEstado().isBlank())
            throw new IllegalArgumentException("Estado inválido");

        existente.setNome(dados.getNome());
        existente.setCrm(dados.getCrm());
        existente.setEstado(dados.getEstado().toUpperCase());

        return repository.save(existente);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id))
            throw new IllegalArgumentException("Médico não encontrado");
        repository.deleteById(id);
    }

    public List<Medico> listarTodos() {
        return repository.findAll();
    }
}
