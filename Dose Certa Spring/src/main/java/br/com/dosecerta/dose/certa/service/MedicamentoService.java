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
        validar(medicamento);
        return repository.save(medicamento);
    }

    public Medicamento atualizar(Long id, Medicamento dados) {
        Medicamento existente = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Medicamento não encontrado"));

        validar(dados);

        existente.setNome(dados.getNome());
        existente.setBrand(dados.getBrand());
        existente.setDosePorKg(dados.getDosePorKg());
        existente.setDoseMaxima(dados.getDoseMaxima());
        existente.setDoseDisponivel(dados.getDoseDisponivel());
        existente.setVolumeDisponivel(dados.getVolumeDisponivel());
        existente.setIntervalo(dados.getIntervalo());
        existente.setNotas(dados.getNotas());
        existente.setTipoPadrao(dados.getTipoPadrao());
        existente.setFatorGotejamento(dados.getFatorGotejamento());
        existente.setTempoMinutos(dados.getTempoMinutos());

        return repository.save(existente);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id))
            throw new IllegalArgumentException("Medicamento não encontrado");
        repository.deleteById(id);
    }

    private void validar(Medicamento medicamento) {
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
    }

    public List<Medicamento> listarTodos() {
        return repository.findAll();
    }
}
