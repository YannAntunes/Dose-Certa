package br.com.dosecerta.dose.certa.exame.repo;

/**
 * Classes/interfaces mantidas para retrocompatibilidade com importacoes existentes.
 */
public final class ExamRepositories {

    private ExamRepositories() {}

    public interface ExamRepository extends br.com.dosecerta.dose.certa.exame.repo.ExamRepository {}
    public interface ExamResultRepository extends br.com.dosecerta.dose.certa.exame.repo.ExamResultRepository {}
    public interface ReferenceRangeRepository extends br.com.dosecerta.dose.certa.exame.repo.ReferenceRangeRepository {}
    public interface ClinicalTargetRepository extends br.com.dosecerta.dose.certa.exame.repo.ClinicalTargetRepository {}
    public interface ExamAnalysisRepository extends br.com.dosecerta.dose.certa.exame.repo.ExamAnalysisRepository {}
    public interface ClinicalFindingRepository extends br.com.dosecerta.dose.certa.exame.repo.ClinicalFindingRepository {}
    public interface AnalysisSourceRepository extends br.com.dosecerta.dose.certa.exame.repo.AnalysisSourceRepository {}
}
