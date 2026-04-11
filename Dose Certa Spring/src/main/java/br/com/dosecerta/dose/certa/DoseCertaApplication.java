package br.com.dosecerta.dose.certa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = "br.com.dosecerta")
public class DoseCertaApplication {

    public static void main(String[] args) {
        SpringApplication.run(DoseCertaApplication.class, args);
    }
}
