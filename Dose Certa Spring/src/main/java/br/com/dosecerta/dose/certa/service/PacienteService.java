package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.controller.RegraClinicaException;
import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.repository.PacienteRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PacienteService {

    private final PacienteRepository repository;

    public PacienteService(PacienteRepository repository) {
        this.repository = repository;
    }

    public Paciente salvar(Paciente paciente) {
        if (paciente.getNome() == null || paciente.getNome().isBlank())
            throw new IllegalArgumentException("Nome inválido");

        if (paciente.getCpf() == null || paciente.getCpf().isBlank())
            throw new IllegalArgumentException("CPF inválido");

        if (paciente.getPeso() <= 0 || paciente.getPeso() > 500)
            throw new IllegalArgumentException("Peso inválido");

        if (paciente.getIdade() < 0 || paciente.getIdade() > 120)
            throw new IllegalArgumentException("Idade inválida");

        if (repository.existsByCpf(paciente.getCpf())) {
            throw new RegraClinicaException("CPF já cadastrado");
        }

        return repository.save(paciente);
    }

    public List<Paciente> listarTodos() {
        return repository.findAll();
    }
}
