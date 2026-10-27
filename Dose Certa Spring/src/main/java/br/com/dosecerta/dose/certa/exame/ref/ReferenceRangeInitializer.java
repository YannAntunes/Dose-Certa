package br.com.dosecerta.dose.certa.exame.ref;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.BoundOperator;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ReferenceOrigin;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Sex;
import br.com.dosecerta.dose.certa.exame.model.ReferenceRange;
import br.com.dosecerta.dose.certa.exame.repo.ReferenceRangeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Inicializador de referências clínicas baseadas nas principais diretrizes médicas brasileiras:
 * SBD (Diabetes 2024), SBC (Dislipidemias 2023), SBPC/ML (2022), SBEM (2023) e SBN (2023).
 *
 * Popula a tabela reference_ranges se estiver vazia para garantir que análises clínicas e
 * avaliações laboratoriais tenham sempre fontes rastreáveis e limites validados.
 */
@Component
public class ReferenceRangeInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ReferenceRangeInitializer.class);

    private final ReferenceRangeRepository repository;

    public ReferenceRangeInitializer(ReferenceRangeRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() > 0) {
            log.info("Tabela reference_ranges já contém registros (count={}). Inicialização pulada.", repository.count());
            return;
        }

        log.info("Inicializando valores de referência padrão com base nas diretrizes médicas brasileiras...");
        List<ReferenceRange> ranges = new ArrayList<>();

        // Glicemia de Jejum (SBD 2024)
        ranges.add(range("GLUCOSE", "mg/dL", "70", BoundOperator.GE, "99", BoundOperator.LE,
                "45", "400", null, 18, null, "Jejum de 8 a 12 horas",
                "Diretriz Oficial da Sociedade Brasileira de Diabetes (SBD)", "2024",
                "https://diretriz.diabetes.org.br"));

        // Hemoglobina Glicada HbA1c (SBD 2024)
        ranges.add(range("HBA1C", "%", "4.0", BoundOperator.GE, "5.6", BoundOperator.LE,
                null, "14.0", null, null, null, "Diagnóstico e rastreamento em não gestantes",
                "Diretriz Oficial da Sociedade Brasileira de Diabetes (SBD)", "2024",
                "https://diretriz.diabetes.org.br"));

        // Glicemia Média Estimada - eAG (SBD 2024 / ADA)
        ranges.add(range("ESTIMATED_AVERAGE_GLUCOSE", "mg/dL", "68", BoundOperator.GE, "114", BoundOperator.LE,
                null, null, null, null, null, "Calculada a partir da HbA1c",
                "Diretriz Oficial da Sociedade Brasileira de Diabetes (SBD)", "2024",
                "https://diretriz.diabetes.org.br"));

        // Colesterol Total (SBC 2023)
        ranges.add(range("CHOL_TOTAL", "mg/dL", null, null, "190", BoundOperator.LE,
                null, null, null, 20, null, "Com ou sem jejum",
                "Atualização da Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose (SBC)", "2023",
                "https://publicacoes.cardiol.br"));

        // HDL Colesterol (SBC 2023)
        ranges.add(range("HDL", "mg/dL", "40", BoundOperator.GE, null, null,
                null, null, null, 20, null, "Desejável > 40 mg/dL",
                "Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose (SBC)", "2023",
                "https://publicacoes.cardiol.br"));

        // LDL Colesterol (SBC 2023 - Risco habitual)
        ranges.add(range("LDL", "mg/dL", null, null, "130", BoundOperator.LE,
                null, null, null, 20, null, "Risco cardiovascular habitual / intermediário",
                "Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose (SBC)", "2023",
                "https://publicacoes.cardiol.br"));

        // Triglicerídeos (SBC 2023)
        ranges.add(range("TRIGLYCERIDES", "mg/dL", null, null, "150", BoundOperator.LE,
                null, "500", null, 20, null, "Com jejum (< 175 sem jejum)",
                "Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose (SBC)", "2023",
                "https://publicacoes.cardiol.br"));

        // Creatinina Homem (SBN 2023)
        ranges.add(range("CREATININE", "mg/dL", "0.70", BoundOperator.GE, "1.30", BoundOperator.LE,
                null, "4.0", Sex.M, 18, 120, "Adultos do sexo masculino",
                "Sociedade Brasileira de Nefrologia (SBN) / Diretrizes Clínicas", "2023",
                "https://sbn.org.br"));

        // Creatinina Mulher (SBN 2023)
        ranges.add(range("CREATININE", "mg/dL", "0.50", BoundOperator.GE, "1.10", BoundOperator.LE,
                null, "4.0", Sex.F, 18, 120, "Adultos do sexo feminino",
                "Sociedade Brasileira de Nefrologia (SBN) / Diretrizes Clínicas", "2023",
                "https://sbn.org.br"));

        // Ureia (SBN 2023)
        ranges.add(range("UREA", "mg/dL", "15", BoundOperator.GE, "45", BoundOperator.LE,
                null, "150", null, 18, 120, null,
                "Sociedade Brasileira de Nefrologia (SBN)", "2023",
                "https://sbn.org.br"));

        // Hemoglobina Homem (SBPC/ML 2022)
        ranges.add(range("HEMOGLOBIN", "g/dL", "13.0", BoundOperator.GE, "17.5", BoundOperator.LE,
                "7.0", "20.0", Sex.M, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Hemoglobina Mulher (SBPC/ML 2022)
        ranges.add(range("HEMOGLOBIN", "g/dL", "12.0", BoundOperator.GE, "15.5", BoundOperator.LE,
                "7.0", "20.0", Sex.F, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Hematócrito Homem (SBPC/ML 2022)
        ranges.add(range("HEMATOCRIT", "%", "40.0", BoundOperator.GE, "52.0", BoundOperator.LE,
                "20.0", "60.0", Sex.M, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Hematócrito Mulher (SBPC/ML 2022)
        ranges.add(range("HEMATOCRIT", "%", "36.0", BoundOperator.GE, "47.0", BoundOperator.LE,
                "20.0", "60.0", Sex.F, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Leucócitos (SBPC/ML 2022)
        ranges.add(range("LEUKOCYTES", "/mm3", "4000", BoundOperator.GE, "11000", BoundOperator.LE,
                "2000", "30000", null, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Plaquetas (SBPC/ML 2022)
        ranges.add(range("PLATELETS", "/mm3", "150000", BoundOperator.GE, "450000", BoundOperator.LE,
                "50000", "1000000", null, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // TGO / AST Homem (SBPC/ML 2022)
        ranges.add(range("AST", "U/L", null, null, "40", BoundOperator.LE,
                null, "200", Sex.M, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // TGO / AST Mulher (SBPC/ML 2022)
        ranges.add(range("AST", "U/L", null, null, "32", BoundOperator.LE,
                null, "200", Sex.F, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // TGP / ALT Homem (SBPC/ML 2022)
        ranges.add(range("ALT", "U/L", null, null, "41", BoundOperator.LE,
                null, "200", Sex.M, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // TGP / ALT Mulher (SBPC/ML 2022)
        ranges.add(range("ALT", "U/L", null, null, "33", BoundOperator.LE,
                null, "200", Sex.F, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Potássio (SBPC/ML 2022)
        ranges.add(range("POTASSIUM", "mEq/L", "3.5", BoundOperator.GE, "5.1", BoundOperator.LE,
                "2.8", "6.2", null, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Sódio (SBPC/ML 2022)
        ranges.add(range("SODIUM", "mEq/L", "136", BoundOperator.GE, "145", BoundOperator.LE,
                "120", "160", null, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // TSH (SBEM 2023)
        ranges.add(range("TSH", "uIU/mL", "0.40", BoundOperator.GE, "4.50", BoundOperator.LE,
                "0.10", "15.0", null, 18, 120, "Não gestantes",
                "Sociedade Brasileira de Endocrinologia e Metabologia (SBEM)", "2023",
                "https://endocrino.org.br"));

        // Vitamina D 25-OH (SBEM 2023)
        ranges.add(range("VITAMIN_D", "ng/mL", "20", BoundOperator.GE, "100", BoundOperator.LE,
                "10", null, null, 18, 120, "População geral saudável (20-60 ng/mL; grupos de risco 30-60 ng/mL)",
                "Sociedade Brasileira de Endocrinologia e Metabologia (SBEM)", "2023",
                "https://endocrino.org.br"));

        // Vitamina B12 (SBPC/ML 2022)
        ranges.add(range("VITAMIN_B12", "pg/mL", "200", BoundOperator.GE, "900", BoundOperator.LE,
                "150", null, null, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Albumina (SBPC/ML 2022)
        ranges.add(range("ALBUMIN", "g/dL", "3.5", BoundOperator.GE, "5.2", BoundOperator.LE,
                "2.0", null, null, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Cálcio Total (SBPC/ML 2022)
        ranges.add(range("CALCIUM", "mg/dL", "8.5", BoundOperator.GE, "10.2", BoundOperator.LE,
                "6.5", "13.0", null, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Ferritina Homem (SBPC/ML 2022)
        ranges.add(range("FERRITIN", "ng/mL", "30", BoundOperator.GE, "400", BoundOperator.LE,
                null, null, Sex.M, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        // Ferritina Mulher (SBPC/ML 2022)
        ranges.add(range("FERRITIN", "ng/mL", "15", BoundOperator.GE, "150", BoundOperator.LE,
                null, null, Sex.F, 18, 120, null,
                "Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML)", "2022",
                "https://sbpc.org.br"));

        repository.saveAll(ranges);
        log.info("Inicialização de valores de referência concluída com sucesso: {} faixas inseridas.", ranges.size());
    }

    private ReferenceRange range(String testCode, String unit,
                                 String lower, BoundOperator lowerOp,
                                 String upper, BoundOperator upperOp,
                                 String critLow, String critHigh,
                                 Sex sex, Integer ageMin, Integer ageMax,
                                 String conditions,
                                 String sourceTitle, String sourceVersion, String sourceUrl) {
        ReferenceRange r = new ReferenceRange();
        r.setTestCode(testCode);
        r.setOrigin(ReferenceOrigin.EXTERNAL_DOCUMENTED);
        r.setUnit(unit);
        r.setLowerBound(lower != null ? new BigDecimal(lower) : null);
        r.setLowerOp(lowerOp);
        r.setUpperBound(upper != null ? new BigDecimal(upper) : null);
        r.setUpperOp(upperOp);
        r.setCriticalLow(critLow != null ? new BigDecimal(critLow) : null);
        r.setCriticalHigh(critHigh != null ? new BigDecimal(critHigh) : null);
        r.setSex(sex);
        r.setAgeMinYears(ageMin);
        r.setAgeMaxYears(ageMax);
        r.setConditions(conditions);
        r.setSourceTitle(sourceTitle);
        r.setSourceVersion(sourceVersion);
        r.setSourceUrl(sourceUrl);
        r.setRegisteredAt(LocalDateTime.now());
        return r;
    }
}
