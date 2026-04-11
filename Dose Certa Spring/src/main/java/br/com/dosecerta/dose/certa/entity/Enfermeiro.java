package br.com.dosecerta.dose.certa.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "enfermeiros")
public class Enfermeiro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String coren;

    @Column(nullable = false, length = 2)
    private String estado;

    // JPA exige construtor vazio
    public Enfermeiro() {}

    // getters e setters (SEM validação)
    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getCoren() {
        return coren;
    }

    public void setCoren(String coren) {
        this.coren = coren;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}
