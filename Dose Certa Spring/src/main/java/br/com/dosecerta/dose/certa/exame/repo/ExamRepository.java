package br.com.dosecerta.dose.certa.exame.repo;

import br.com.dosecerta.dose.certa.exame.model.Exam;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    Page<Exam> findByPacienteId(Long pacienteId, Pageable pageable);

    Optional<Exam> findByPacienteIdAndFileSha256(Long pacienteId, String fileSha256);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Exam e where e.id = :id")
    Optional<Exam> findByIdForUpdate(@Param("id") Long id);
}
