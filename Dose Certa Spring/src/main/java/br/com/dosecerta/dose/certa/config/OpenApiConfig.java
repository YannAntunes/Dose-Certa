package br.com.dosecerta.dose.certa.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI doseCertaOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Dose Certa API")
                        .description("API para cálculo seguro de dosagem de medicamentos")
                        .version("1.0.0"));
    }
}
