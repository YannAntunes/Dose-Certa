package br.com.dosecerta.dose.certa.repository;

import br.com.dosecerta.dose.certa.entity.Enfermeiro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnfermeiroRepository extends JpaRepository<Enfermeiro, Long> {
}
