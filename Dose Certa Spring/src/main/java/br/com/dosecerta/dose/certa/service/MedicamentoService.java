package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.entity.Medicamento;
import br.com.dosecerta.dose.certa.repository.MedicamentoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MedicamentoService {

    private final MedicamentoRepository repository;

    public MedicamentoService(MedicamentoRepository repository) {
        this.repository = repository;
    }

    public Medicamento salvar(Medicamento medicamento) {

        if (medicamento.getNome() == null || medicamento.getNome().isBlank())
            throw new IllegalArgumentException("Nome inválido");

        if (medicamento.getDosePorKg() <= 0)
            throw new IllegalArgumentException("Dose por Kg inválida");

        if (medicamento.getDoseMaxima() <= 0)
            throw new IllegalArgumentException("Dose máxima inválida");

        if (medicamento.getDoseDisponivel() <= 0)
            throw new IllegalArgumentException("Dose disponível inválida");

        if (medicamento.getVolumeDisponivel() <= 0)
            throw new IllegalArgumentException("Volume inválido");

        return repository.save(medicamento);
    }

    public List<Medicamento> listarTodos() {
        return repository.findAll();
    }
}
