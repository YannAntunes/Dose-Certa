package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.entity.Medicamento;
import br.com.dosecerta.dose.certa.entity.TipoCalculo;
import org.springframework.stereotype.Service;

@Service
public class DosagemService {

    // mg/kg
    public double calcularDoseMgKg(double pesoKg, Medicamento medicamento) {
        double dose = pesoKg * medicamento.getDosePorKg();
        return Math.min(dose, medicamento.getDoseMaxima());
    }

    // mL/h
    public double calcularVolumeMlHora(Medicamento medicamento) {
        return medicamento.getVolumeDisponivel() / medicamento.getTempoMinutos() * 60;
    }

    // gotas/min
    public double calcularGotasMinuto(Medicamento medicamento) {
        double mlPorMinuto = medicamento.getVolumeDisponivel() / medicamento.getTempoMinutos();
        return mlPorMinuto * medicamento.getFatorGotejamento();
    }

    public double calcularPorTipo(
            TipoCalculo tipo,
            double peso,
            Medicamento medicamento
    ) {
        return switch (tipo) {
            case DOSE_MGKG -> calcularDoseMgKg(peso, medicamento);
            case VOLUME_MLH -> calcularVolumeMlHora(medicamento);
            case GOTAS_MIN -> calcularGotasMinuto(medicamento);
        };
    }
}
