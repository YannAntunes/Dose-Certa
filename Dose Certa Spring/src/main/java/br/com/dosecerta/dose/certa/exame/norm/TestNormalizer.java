package br.com.dosecerta.dose.certa.exame.norm;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.*;

/**
 * Normalizacao de nomes de exames e unidades. Somente correspondencias EXATAS de alias
 * (apos remover acentos/pontuacao) sao aceitas; nao ha correspondencia aproximada nem conversao de unidades.
 */
@Component
public class TestNormalizer {

    public record TestInfo(String code, String canonicalName, Set<String> allowedUnits) {}

    private static final Map<String, TestInfo> BY_ALIAS = new HashMap<>();
    /** Chave de unidade (minuscula, sem espacos) -> forma canonica. Equivalencias aqui sao exatas por definicao. */
    private static final Map<String, String> UNITS = new HashMap<>();

    static {
        unit("mg/dL", "mg/dl");
        unit("mg/L", "mg/l");
        unit("g/dL", "g/dl");
        unit("g/L", "g/l");
        unit("%", "%");
        unit("U/L", "u/l", "ui/l", "iu/l");
        unit("mEq/L", "meq/l");
        unit("mmol/L", "mmol/l");
        unit("mmol/mol", "mmol/mol");
        unit("\u00b5mol/L", "umol/l");
        unit("/mm\u00b3", "/mm3", "/mm\u00b3", "/ul", "/\u00b5l", "/mcl");
        unit("milh\u00f5es/mm\u00b3", "milhoes/mm3", "milh\u00f5es/mm\u00b3", "mi/mm3", "milhoes/ul", "milh\u00f5es/ul");
        unit("mil/mm\u00b3", "mil/mm3", "mil/mm\u00b3", "mil/ul", "mil/\u00b5l");
        unit("mL/min/1,73m\u00b2", "ml/min/1,73m2", "ml/min/1,73m\u00b2", "ml/min/1.73m2", "ml/min/1.73m\u00b2");
        unit("fL", "fl");
        unit("pg", "pg");
        unit("ng/mL", "ng/ml");
        unit("pg/mL", "pg/ml");
        unit("ng/dL", "ng/dl");
        unit("\u00b5g/dL", "ug/dl", "mcg/dl");
        unit("\u00b5UI/mL", "uui/ml", "uiu/ml", "\u00b5ui/ml", "miu/l");
        unit("mUI/L", "mui/l");
        unit("mm/h", "mm/h", "mm/1h", "mm");

        test("HEMOGLOBIN", "Hemoglobina", List.of("g/dL"), "hemoglobina", "hb");
        test("HEMATOCRIT", "Hematocrito", List.of("%"), "hematocrito", "ht");
        test("ERYTHROCYTES", "Hemacias", List.of("milh\u00f5es/mm\u00b3", "/mm\u00b3"),
                "hemacias", "eritrocitos", "hemacias eritrocitos", "eritrocitos hemacias");
        test("MCV", "VCM", List.of("fL"), "vcm", "volume corpuscular medio");
        test("MCH", "HCM", List.of("pg"), "hcm", "hemoglobina corpuscular media");
        test("MCHC", "CHCM", List.of("g/dL", "%"), "chcm", "concentracao de hemoglobina corpuscular media");
        test("LEUKOCYTES", "Leucocitos", List.of("/mm\u00b3", "mil/mm\u00b3"), "leucocitos", "leucocitos totais");
        test("PLATELETS", "Plaquetas", List.of("/mm\u00b3", "mil/mm\u00b3"), "plaquetas", "contagem de plaquetas");
        test("GLUCOSE", "Glicose", List.of("mg/dL", "mmol/L"),
                "glicose", "glicemia", "glicemia de jejum", "glicose jejum", "glicose de jejum", "glicose em jejum", "glicemia serica");
        test("ESTIMATED_AVERAGE_GLUCOSE", "Glicemia média estimada", List.of("mg/dL", "mmol/L"),
                "glicemia media estimada", "glicemia estimada", "eag", "glicemia media estimada eag", "media glicemica estimada", "glicemia media");
        test("HBA1C", "Hemoglobina glicada", List.of("%", "mmol/mol"),
                "hemoglobina glicada", "hemoglobina glicosilada", "hba1c", "hemoglobina a1c", "hb a1c");
        test("CHOL_TOTAL", "Colesterol total", List.of("mg/dL", "mmol/L"), "colesterol total");
        test("HDL", "Colesterol HDL", List.of("mg/dL", "mmol/L"),
                "colesterol hdl", "hdl", "hdl colesterol", "hdl c", "colesterol hdl hdl c");
        test("LDL", "Colesterol LDL", List.of("mg/dL", "mmol/L"),
                "colesterol ldl", "ldl", "ldl colesterol", "ldl c");
        test("VLDL", "Colesterol VLDL", List.of("mg/dL", "mmol/L"), "colesterol vldl", "vldl", "vldl colesterol");
        test("NON_HDL", "Colesterol nao HDL", List.of("mg/dL", "mmol/L"), "colesterol nao hdl", "nao hdl");
        test("TRIGLYCERIDES", "Triglicerides", List.of("mg/dL", "mmol/L"),
                "triglicerides", "triglicerideos", "triglicérides");
        test("UREA", "Ureia", List.of("mg/dL", "mmol/L"), "ureia");
        test("CREATININE", "Creatinina", List.of("mg/dL", "\u00b5mol/L"), "creatinina", "creatinina serica");
        test("EGFR", "Filtracao glomerular estimada", List.of("mL/min/1,73m\u00b2"),
                "egfr", "tfg", "tfg estimada", "taxa de filtracao glomerular estimada",
                "estimativa da filtracao glomerular", "filtracao glomerular estimada", "filtracao glomerular");
        test("SODIUM", "Sodio", List.of("mEq/L", "mmol/L"), "sodio", "na");
        test("POTASSIUM", "Potassio", List.of("mEq/L", "mmol/L"), "potassio", "k");
        test("AST", "TGO/AST", List.of("U/L"), "tgo", "ast", "tgo ast", "ast tgo", "tgo/ast",
                "transaminase oxalacetica", "transaminase glutamico oxalacetica", "aspartato aminotransferase", "tgo transaminase oxalacetica");
        test("ALT", "TGP/ALT", List.of("U/L"), "tgp", "alt", "tgp alt", "alt tgp", "tgp/alt",
                "transaminase piruvica", "transaminase glutamico piruvica", "alanina aminotransferase", "tgp transaminase piruvica");
        test("GGT", "Gama GT", List.of("U/L"), "ggt", "gama gt", "gama glutamil transferase", "gama-gt");
        test("ALP", "Fosfatase alcalina", List.of("U/L"), "fosfatase alcalina", "fa");
        test("BILI_TOTAL", "Bilirrubina total", List.of("mg/dL", "\u00b5mol/L"), "bilirrubina total", "bilirrubinas totais");
        test("BILI_DIRECT", "Bilirrubina direta", List.of("mg/dL", "\u00b5mol/L"), "bilirrubina direta");
        test("BILI_INDIRECT", "Bilirrubina indireta", List.of("mg/dL", "\u00b5mol/L"), "bilirrubina indireta");
        test("TSH", "TSH", List.of("\u00b5UI/mL", "mUI/L"), "tsh", "hormonio tireoestimulante");
        test("URIC_ACID", "Acido urico", List.of("mg/dL", "\u00b5mol/L"), "acido urico", "urato");
        test("CALCIUM", "Calcio total", List.of("mg/dL", "mmol/L"), "calcio", "calcio total", "calcio serico");
        test("MAGNESIUM", "Magnesio", List.of("mg/dL", "mEq/L"), "magnesio", "magnesio serico");
        test("PHOSPHORUS", "Fosforo", List.of("mg/dL"), "fosforo", "fosforo inorganico");
        test("FERRITIN", "Ferritina", List.of("ng/mL"), "ferritina", "ferritina serica");
        test("VITAMIN_D", "Vitamina D (25-OH)", List.of("ng/mL"),
                "vitamina d", "vitamina d 25 oh", "25 oh vitamina d", "25 hidroxivitamina d", "25 hidroxi vitamina d");
        test("VITAMIN_B12", "Vitamina B12", List.of("pg/mL"), "vitamina b12", "cobalamina");
        test("ALBUMIN", "Albumina", List.of("g/dL"), "albumina", "albumina serica");
        test("TOTAL_PROTEIN", "Proteinas totais", List.of("g/dL"), "proteinas totais");
        test("CRP", "Proteina C-Reativa (PCR)", List.of("mg/L", "mg/dL"), "pcr", "proteina c reativa", "pcr ultrassensivel");
        test("VHS", "VHS", List.of("mm/h"), "vhs", "velocidade de hemossedimentacao");
    }

    private static void unit(String canonical, String... keys) {
        UNITS.put(unitKey(canonical), canonical);
        for (String k : keys) UNITS.put(unitKey(k), canonical);
    }

    private static void test(String code, String name, List<String> units, String... aliases) {
        TestInfo info = new TestInfo(code, name, Set.copyOf(units));
        for (String a : aliases) BY_ALIAS.put(key(a), info);
    }

    /** Normaliza texto: sem acentos, minusculo, apenas letras/digitos separados por espaco unico. */
    public static String key(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        return n.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    private static String unitKey(String u) {
        return u.toLowerCase(Locale.ROOT).replace('\u03bc', '\u00b5').replaceAll("\\s+", "");
    }

    public Optional<TestInfo> identifyTest(String originalName) {
        return Optional.ofNullable(BY_ALIAS.get(key(originalName)));
    }

    /** Forma canonica da unidade, se conhecida; vazio caso contrario (a unidade original e preservada). */
    public Optional<String> canonicalUnit(String unit) {
        if (unit == null || unit.isBlank()) return Optional.empty();
        return Optional.ofNullable(UNITS.get(unitKey(unit.trim())));
    }

    /** Unidade e conhecida/aceita para o analito? Verdadeiro apenas se canonica pertencer ao conjunto permitido. */
    public boolean unitAllowedFor(TestInfo test, String canonicalUnit) {
        return test != null && canonicalUnit != null && test.allowedUnits().contains(canonicalUnit);
    }
}
