package br.com.dosecerta.dose.certa.config;

import br.com.dosecerta.dose.certa.entity.Medicamento;
import br.com.dosecerta.dose.certa.entity.TipoCalculo;
import br.com.dosecerta.dose.certa.repository.MedicamentoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class MedicamentoSeeder {

    private static final Logger log = LoggerFactory.getLogger(MedicamentoSeeder.class);

    @Bean
    public CommandLineRunner initMedicamentos(
            MedicamentoRepository repository,
            @Value("${app.seed.medicamentos-enabled:true}") boolean seedEnabled
    ) {
        return args -> {
            if (!seedEnabled) {
                return;
            }
            if (repository.count() < 10) {
                Medicamento m1 = createMedicamento("Dipirona", "Novalgina", 15.0, 1000.0, 500.0, 1.0, 20, 0, "6 em 6 horas", "Uso comum para febre e dor", TipoCalculo.DOSE_MGKG);
                Medicamento m2 = createMedicamento("Paracetamol", "Tylenol", 10.0, 750.0, 200.0, 1.0, 20, 0, "6 em 6 horas", "Antitérmico", TipoCalculo.DOSE_MGKG);
                Medicamento m3 = createMedicamento("Amoxicilina", "Amoxil", 50.0, 1500.0, 250.0, 5.0, 0, 0, "8 em 8 horas", "Antibiótico de amplo espectro", TipoCalculo.DOSE_MGKG);
                Medicamento m4 = createMedicamento("Ibuprofeno", "Alivium", 10.0, 800.0, 50.0, 1.0, 20, 0, "8 em 8 horas", "Anti-inflamatório", TipoCalculo.DOSE_MGKG);
                Medicamento m5 = createMedicamento("Ceftriaxona", "Rocefin", 50.0, 2000.0, 1000.0, 10.0, 20, 30, "12 em 12 horas", "Antibiótico intravenoso", TipoCalculo.VOLUME_MLH);
                Medicamento m6 = createMedicamento("Ondansetrona", "Vonau", 0.15, 8.0, 4.0, 2.0, 0, 0, "8 em 8 horas", "Antiemético", TipoCalculo.DOSE_MGKG);
                Medicamento m7 = createMedicamento("Dexametasona", "Decadron", 0.1, 10.0, 4.0, 1.0, 0, 0, "12 em 12 horas", "Corticosteroide", TipoCalculo.DOSE_MGKG);
                Medicamento m8 = createMedicamento("Cetoprofeno", "Profenid", 2.0, 100.0, 100.0, 2.0, 20, 30, "12 em 12 horas", "AINE intravenoso", TipoCalculo.VOLUME_MLH);
                Medicamento m9 = createMedicamento("Adrenalina", "Epinefrina", 0.01, 1.0, 1.0, 1.0, 60, 0, "Emergência", "Parada cardiorrespiratória ou anafilaxia", TipoCalculo.DOSE_MGKG);
                Medicamento m10 = createMedicamento("Morfina", "Dimorf", 0.1, 15.0, 10.0, 1.0, 20, 0, "4 em 4 horas", "Opioide forte", TipoCalculo.DOSE_MGKG);

                repository.saveAll(List.of(m1, m2, m3, m4, m5, m6, m7, m8, m9, m10));
                log.info("10 medicamentos iniciais inseridos no banco de dados.");
            }
        };
    }

    private Medicamento createMedicamento(String nome, String brand, double dosePorKg, double doseMaxima,
                                          double doseDisponivel, double volumeDisponivel, int fatorGotejamento,
                                          int tempoMinutos, String intervalo, String notas, TipoCalculo tipoPadrao) {
        Medicamento m = new Medicamento();
        m.setNome(nome);
        m.setBrand(brand);
        m.setDosePorKg(dosePorKg);
        m.setDoseMaxima(doseMaxima);
        m.setDoseDisponivel(doseDisponivel);
        m.setVolumeDisponivel(volumeDisponivel);
        m.setFatorGotejamento(fatorGotejamento);
        m.setTempoMinutos(tempoMinutos);
        m.setIntervalo(intervalo);
        m.setNotas(notas);
        m.setTipoPadrao(tipoPadrao);
        return m;
    }
}
